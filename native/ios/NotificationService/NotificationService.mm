#import "NotificationService.h"
#import "Logger.h"
#import "NotificationsCryptoModule.h"
#import "TemporaryMessageStorage.h"

NSString *const backgroundNotificationTypeKey = @"backgroundNotifType";
NSString *const messageInfosKey = @"messageInfos";
const std::string callingProcessName = "NSE";
// The context for this constant can be found here:
// https://linear.app/comm/issue/ENG-3074#comment-bd2f5e28
int64_t const notificationRemovalDelay = (int64_t)(0.1 * NSEC_PER_SEC);
CFStringRef newMessageInfosDarwinNotification =
    CFSTR("app.comm.darwin_new_message_infos");

@interface NotificationService ()

@property(nonatomic, strong) void (^contentHandler)
    (UNNotificationContent *contentToDeliver);
@property(nonatomic, strong) UNMutableNotificationContent *bestAttemptContent;

@end

@implementation NotificationService

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request
                   withContentHandler:
                       (void (^)(UNNotificationContent *_Nonnull))
                           contentHandler {
  self.contentHandler = contentHandler;
  self.bestAttemptContent = [request.content mutableCopy];

  if ([self shouldBeDecrypted:self.bestAttemptContent.userInfo]) {
    [self decryptBestAttemptContent];
  }

  [self persistMessagePayload:self.bestAttemptContent.userInfo];
  // Message payload persistence is a higher priority task, so it has
  // to happen prior to potential notification center clearing.
  if ([self isRescind:self.bestAttemptContent.userInfo]) {
    [self removeNotificationWithIdentifier:self.bestAttemptContent
                                               .userInfo[@"notificationId"]];
    self.contentHandler([[UNNotificationContent alloc] init]);
    return;
  }
  [self sendNewMessageInfosNotification];
  // TODO modify self.bestAttemptContent here

  self.contentHandler(self.bestAttemptContent);
}

- (void)serviceExtensionTimeWillExpire {
  // Called just before the extension will be terminated by the system.
  // Use this as an opportunity to deliver your "best attempt" at modified
  // content, otherwise the original push payload will be used.
  if ([self isRescind:self.bestAttemptContent.userInfo]) {
    // If we get to this place it means we were unable to
    // remove relevant notification from notification center in
    // in time given to NSE to process notification.
    // It is an extremely unlikely to happen.
    comm::Logger::log("NSE: Exceeded time limit to rescind a notification.");
    self.contentHandler([[UNNotificationContent alloc] init]);
    return;
  }
  if ([self shouldBeDecrypted:self.bestAttemptContent.userInfo] &&
      !self.bestAttemptContent.userInfo[@"succesfullyDecrypted"]) {
    // If we get to this place it means we were unable to
    // decrypt encrypted notification content in time
    // given to NSE to process notification.
    comm::Logger::log("NSE: Exceeded time limit to decrypt a notification.");
    self.contentHandler([[UNNotificationContent alloc] init]);
    return;
  }
  self.contentHandler(self.bestAttemptContent);
}

- (void)removeNotificationWithIdentifier:(NSString *)identifier {
  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

  void (^delayedSemaphorePostCallback)() = ^() {
    dispatch_time_t timeToPostSemaphore =
        dispatch_time(DISPATCH_TIME_NOW, notificationRemovalDelay);
    dispatch_after(timeToPostSemaphore, dispatch_get_main_queue(), ^{
      dispatch_semaphore_signal(semaphore);
    });
  };

  [UNUserNotificationCenter.currentNotificationCenter
      getDeliveredNotificationsWithCompletionHandler:^(
          NSArray<UNNotification *> *_Nonnull notifications) {
        for (UNNotification *notif in notifications) {
          if ([identifier isEqual:notif.request.content.userInfo[@"id"]]) {
            [UNUserNotificationCenter.currentNotificationCenter
                removeDeliveredNotificationsWithIdentifiers:@[
                  notif.request.identifier
                ]];
          }
        }
        delayedSemaphorePostCallback();
      }];

  dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
}

- (void)persistMessagePayload:(NSDictionary *)payload {
  if (payload[messageInfosKey]) {
    TemporaryMessageStorage *temporaryStorage =
        [[TemporaryMessageStorage alloc] init];
    [temporaryStorage writeMessage:payload[messageInfosKey]];
    return;
  }

  if (![self isRescind:payload]) {
    return;
  }

  NSError *jsonError = nil;
  NSData *binarySerializedRescindPayload =
      [NSJSONSerialization dataWithJSONObject:payload
                                      options:0
                                        error:&jsonError];
  if (jsonError) {
    comm::Logger::log(
        "NSE: Failed to serialize rescind payload. Details: " +
        std::string([jsonError.localizedDescription UTF8String]));
    return;
  }

  NSString *serializedRescindPayload =
      [[NSString alloc] initWithData:binarySerializedRescindPayload
                            encoding:NSUTF8StringEncoding];

  TemporaryMessageStorage *temporaryRescindsStorage =
      [[TemporaryMessageStorage alloc] initForRescinds];
  [temporaryRescindsStorage writeMessage:serializedRescindPayload];
}

- (BOOL)isRescind:(NSDictionary *)payload {
  return payload[backgroundNotificationTypeKey] &&
      [payload[backgroundNotificationTypeKey] isEqualToString:@"CLEAR"];
}

- (void)sendNewMessageInfosNotification {
  CFNotificationCenterPostNotification(
      CFNotificationCenterGetDarwinNotifyCenter(),
      newMessageInfosDarwinNotification,
      (__bridge const void *)(self),
      nil,
      TRUE);
}

- (BOOL)shouldBeDecrypted:(NSDictionary *)payload {
  return payload[@"encrypted"] &&
      [payload[@"encrypted"] isEqualToString:@"true"];
}

- (void)decryptBestAttemptContent {
  std::string encryptedBody =
      std::string([self.bestAttemptContent.body UTF8String]);
  NSString *decryptedBody =
      [NSString stringWithUTF8String:(comm::NotificationsCryptoModule::decrypt(
                                          encryptedBody, 1, callingProcessName))
                                         .c_str()];
  self.bestAttemptContent.body = decryptedBody;

  std::string encryptedThreadID =
      std::string([self.bestAttemptContent.threadIdentifier UTF8String]);
  NSString *decryptedThreadID = [NSString
      stringWithUTF8String:
          (comm::NotificationsCryptoModule::decrypt(
               encryptedThreadID,
               comm::NotificationsCryptoModule::olmEncryptedTypeMessage,
               "NSE"))
              .c_str()];
  self.bestAttemptContent.threadIdentifier = decryptedThreadID;

  std::string encryptedBadge =
      std::string([self.bestAttemptContent.userInfo[@"badge"] UTF8String]);
  NSNumber *decryptedBadge = @([[NSString
      stringWithUTF8String:
          (comm::NotificationsCryptoModule::decrypt(
               encryptedBadge,
               comm::NotificationsCryptoModule::olmEncryptedTypeMessage,
               callingProcessName))
              .c_str()] intValue]);
  self.bestAttemptContent.badge = decryptedBadge;

  NSMutableDictionary *mutableUserInfo =
      [self.bestAttemptContent.userInfo mutableCopy];

  std::string encryptedMessageInfos =
      std::string([mutableUserInfo[messageInfosKey] UTF8String]);
  NSString *decryptedMessageInfos = [NSString
      stringWithUTF8String:
          (comm::NotificationsCryptoModule::decrypt(
               encryptedMessageInfos,
               comm::NotificationsCryptoModule::olmEncryptedTypeMessage,
               callingProcessName))
              .c_str()];
  mutableUserInfo[messageInfosKey] = decryptedMessageInfos;

  mutableUserInfo[@"succesfullyDecrypted"] = @(YES);
  self.bestAttemptContent.userInfo = mutableUserInfo;
}

@end
