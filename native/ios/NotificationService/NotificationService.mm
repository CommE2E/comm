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
  return payload[@"encrypted"] && [payload[@"encrypted"] isEqualToNumber:@(1)];
}

- (NSString *)singleDecrypt:(NSString *)data {
  std::string encryptedData = std::string([data UTF8String]);
  return [NSString
      stringWithUTF8String:
          (comm::NotificationsCryptoModule::decrypt(
               encryptedData,
               comm::NotificationsCryptoModule::olmEncryptedTypeMessage,
               callingProcessName))
              .c_str()];
}

- (void)decryptBestAttemptContent {
  NSMutableDictionary *mutableUserInfo =
      [self.bestAttemptContent.userInfo mutableCopy];

  NSMutableDictionary *mutableAps = nil;
  if (mutableUserInfo[@"aps"]) {
    mutableAps = [mutableUserInfo[@"aps"] mutableCopy];
  }

  if (self.bestAttemptContent.body) {
    NSString *decryptedBody = [self singleDecrypt:self.bestAttemptContent.body];
    self.bestAttemptContent.body = decryptedBody;

    if (mutableAps && mutableAps[@"alert"]) {
      mutableAps[@"alert"] = decryptedBody;
    }
  }

  if (self.bestAttemptContent.threadIdentifier) {
    NSString *decryptedThreadID =
        [self singleDecrypt:self.bestAttemptContent.threadIdentifier];
    self.bestAttemptContent.threadIdentifier = decryptedThreadID;
    mutableUserInfo[@"threadID"] = decryptedThreadID;

    if (mutableAps) {
      mutableAps[@"thread-id"] = decryptedThreadID;
    }
  }

  if (self.bestAttemptContent.userInfo[@"badge"]) {
    NSNumber *decryptedBadge = @([[self
        singleDecrypt:self.bestAttemptContent.userInfo[@"badge"]] intValue]);
    self.bestAttemptContent.badge = decryptedBadge;

    if (mutableAps) {
      mutableAps[@"badge"] = decryptedBadge;
    }
  }

  // Properties 'id' and 'encrypted are not encrypted.
  // The rest have been already decrypted and handled.
  static NSArray<NSString *> *keysToOmit =
      @[ @"id", @"badge", @"threadID", @"aps", @"encrypted" ];

  for (NSString *payloadKey in self.bestAttemptContent.userInfo) {
    if ([keysToOmit containsObject:payloadKey]) {
      continue;
    }

    NSString *decryptedPayloadValue =
        [self singleDecrypt:mutableUserInfo[payloadKey]];
    mutableUserInfo[payloadKey] = decryptedPayloadValue;

    if (mutableAps && mutableAps[payloadKey]) {
      mutableAps[payloadKey] = decryptedPayloadValue;
    }
  }

  if (mutableAps) {
    mutableUserInfo[@"aps"] = mutableAps;
  }

  mutableUserInfo[@"succesfullyDecrypted"] = @(YES);
  self.bestAttemptContent.userInfo = mutableUserInfo;
}

@end
