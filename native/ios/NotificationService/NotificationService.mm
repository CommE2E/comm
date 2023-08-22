#import "NotificationService.h"
#import "Logger.h"
#import "NotificationsCryptoModule.h"
#import "StaffUtils.h"
#import "TemporaryMessageStorage.h"

NSString *const backgroundNotificationTypeKey = @"backgroundNotifType";
NSString *const messageInfosKey = @"messageInfos";
NSString *const encryptedPayloadKey = @"encryptedPayload";
NSString *const encryptionFailureKey = @"encryptionFailure";
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

  UNNotificationContent *publicUserContent = self.bestAttemptContent;

  // Step 1: notification decryption.
  if ([self shouldBeDecrypted:self.bestAttemptContent.userInfo]) {
    std::string decryptErrorMessage;
    try {
      @try {
        [self decryptBestAttemptContent];
      } @catch (NSException *e) {
        decryptErrorMessage = "NSE: Received Obj-C exception: " +
            std::string([e.name UTF8String]) +
            " during notification decryption.";
      }
    } catch (const std::exception &e) {
      decryptErrorMessage =
          "NSE: Received C++ exception: " + std::string(e.what()) +
          " during notification decryption.";
    }

    if (decryptErrorMessage.size()) {
      NSString *errorMessage =
          [NSString stringWithUTF8String:decryptErrorMessage.c_str()];
      [self callContentHandlerOnErrorMessage:errorMessage
                       withPublicUserContent:[[UNNotificationContent alloc]
                                                 init]];
      return;
    }
  } else if ([self shouldAlertUnencryptedNotification:self.bestAttemptContent
                                                          .userInfo]) {
    // In future this will be replaced by notification content
    // modification for DEV environment and staff members
    comm::Logger::log("NSE: Received erroneously unencrypted notitication.");
  }

  std::string cumulatedErrorMessage;

  // Step 2: notification persistence in a temporary storage
  std::string persistErrorMessage;
  try {
    @try {
      [self persistMessagePayload:self.bestAttemptContent.userInfo];
    } @catch (NSException *e) {
      persistErrorMessage =
          "Obj-C exception: " + std::string([e.name UTF8String]) +
          " during notification persistence.";
    }
  } catch (const std::exception &e) {
    persistErrorMessage = "C++ exception: " + std::string(e.what()) +
        " during notification persistence.";
  }

  if (persistErrorMessage.size()) {
    cumulatedErrorMessage += persistErrorMessage + " ";
  }

  // Step 3: (optional) rescind read notifications

  // Message payload persistence is a higher priority task, so it has
  // to happen prior to potential notification center clearing.
  if ([self isRescind:self.bestAttemptContent.userInfo]) {
    std::string rescindErrorMessage;
    try {
      @try {
        [self
            removeNotificationWithIdentifier:self.bestAttemptContent
                                                 .userInfo[@"notificationId"]];
      } @catch (NSException *e) {
        rescindErrorMessage =
            "Obj-C exception: " + std::string([e.name UTF8String]) +
            " during notification rescind.";
      }
    } catch (const std::exception &e) {
      rescindErrorMessage = "C++ exception: " + std::string(e.what()) +
          " during notification rescind.";
    }

    if (rescindErrorMessage.size()) {
      cumulatedErrorMessage += rescindErrorMessage + " ";
    }

    publicUserContent = [[UNNotificationContent alloc] init];
  }

  if ([self isBadgeOnly:self.bestAttemptContent.userInfo]) {
    UNMutableNotificationContent *badgeOnlyContent =
        [[UNMutableNotificationContent alloc] init];
    badgeOnlyContent.badge = self.bestAttemptContent.badge;
    self.bestAttemptContent = badgeOnlyContent;
    publicUserContent = badgeOnlyContent;
  }

  [self sendNewMessageInfosNotification];
  // TODO modify self.bestAttemptContent here
  if (cumulatedErrorMessage.size()) {
    cumulatedErrorMessage = "NSE: Received " + cumulatedErrorMessage;
    [self callContentHandlerOnErrorMessage:
              [NSString stringWithUTF8String:cumulatedErrorMessage.c_str()]
                     withPublicUserContent:publicUserContent];
    return;
  }

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
    NSString *errorMessage =
        @"NSE: Exceeded time limit to rescind a notification.";
    [self
        callContentHandlerOnErrorMessage:errorMessage
                   withPublicUserContent:[[UNNotificationContent alloc] init]];
    return;
  }
  if ([self shouldBeDecrypted:self.bestAttemptContent.userInfo] &&
      !self.bestAttemptContent.userInfo[@"succesfullyDecrypted"]) {
    // If we get to this place it means we were unable to
    // decrypt encrypted notification content in time
    // given to NSE to process notification.
    NSString *errorMessage =
        @"NSE: Exceeded time limit to decrypt a notification.";
    [self
        callContentHandlerOnErrorMessage:errorMessage
                   withPublicUserContent:[[UNNotificationContent alloc] init]];
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

- (BOOL)isBadgeOnly:(NSDictionary *)payload {
  // TODO: refactor this check by introducing
  // badgeOnly property in iOS notification payload
  return !payload[@"threadID"];
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
  return payload[encryptedPayloadKey];
}

- (BOOL)shouldAlertUnencryptedNotification:(NSDictionary *)payload {
  return payload[encryptionFailureKey] &&
      [payload[encryptionFailureKey] isEqualToNumber:@(1)];
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
  NSString *decryptedSerializedPayload = [self
      singleDecrypt:self.bestAttemptContent.userInfo[encryptedPayloadKey]];
  NSDictionary *decryptedPayload = [NSJSONSerialization
      JSONObjectWithData:[decryptedSerializedPayload
                             dataUsingEncoding:NSUTF8StringEncoding]
                 options:0
                   error:nil];

  NSMutableDictionary *mutableUserInfo =
      [self.bestAttemptContent.userInfo mutableCopy];

  NSMutableDictionary *mutableAps = nil;
  if (mutableUserInfo[@"aps"]) {
    mutableAps = [mutableUserInfo[@"aps"] mutableCopy];
  }

  NSString *body = decryptedPayload[@"merged"];
  if (body) {
    self.bestAttemptContent.body = body;
    if (mutableAps && mutableAps[@"alert"]) {
      mutableAps[@"alert"] = body;
    }
  }

  NSString *threadID = decryptedPayload[@"threadID"];
  if (threadID) {
    self.bestAttemptContent.threadIdentifier = threadID;
    mutableUserInfo[@"threadID"] = threadID;
    if (mutableAps) {
      mutableAps[@"thread-id"] = threadID;
    }
  }

  NSString *badgeStr = decryptedPayload[@"badge"];
  if (badgeStr) {
    NSNumber *badge = @([badgeStr intValue]);
    self.bestAttemptContent.badge = badge;
    if (mutableAps) {
      mutableAps[@"badge"] = badge;
    }
  }

  // The rest have been already decrypted and handled.
  static NSArray<NSString *> *handledKeys =
      @[ @"merged", @"badge", @"threadID" ];

  for (NSString *payloadKey in decryptedPayload) {
    if ([handledKeys containsObject:payloadKey]) {
      continue;
    }
    mutableUserInfo[payloadKey] = decryptedPayload[payloadKey];
  }

  if (mutableAps) {
    mutableUserInfo[@"aps"] = mutableAps;
  }
  [mutableUserInfo removeObjectForKey:encryptedPayloadKey];
  self.bestAttemptContent.userInfo = mutableUserInfo;
}

- (UNNotificationContent *)buildContentForError:(NSString *)error {
  UNMutableNotificationContent *content =
      [[UNMutableNotificationContent alloc] init];
  content.body = error;
  return content;
}

- (void)callContentHandlerOnErrorMessage:(NSString *)errorMessage
                   withPublicUserContent:
                       (UNNotificationContent *)publicUserContent {
  comm::Logger::log(std::string([errorMessage UTF8String]));

  if (!comm::StaffUtils::isStaffRelease()) {
    self.contentHandler(publicUserContent);
    return;
  }

  UNNotificationContent *content = [self buildContentForError:errorMessage];
  self.contentHandler(content);
}

@end
