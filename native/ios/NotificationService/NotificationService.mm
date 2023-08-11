#import "NotificationService.h"
#import "Logger.h"
#import "NotificationsCryptoModule.h"
#import "TemporaryMessageStorage.h"
#import <mach/mach.h>

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

// Implementation below was inspired by the
// following discussion with Apple staff member:
// https://developer.apple.com/forums/thread/105088
size_t getMemoryUsage() {
  task_vm_info_data_t vmInfo;
  mach_msg_type_number_t count = TASK_VM_INFO_COUNT;

  kern_return_t result =
      task_info(mach_task_self(), TASK_VM_INFO, (task_info_t)&vmInfo, &count);

  if (result != KERN_SUCCESS) {
    return -1;
  }

  size_t memory_usage = static_cast<size_t>(vmInfo.phys_footprint);
  // We divide to get the result in MB's
  return memory_usage / (1024 * 1024);
}

@interface NotificationService ()

@property(nonatomic, strong) void (^contentHandler)
    (UNNotificationContent *contentToDeliver);
@property(nonatomic, strong) UNMutableNotificationContent *bestAttemptContent;
@property BOOL contentHandlerCalled;

@end

@implementation NotificationService

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request
                   withContentHandler:
                       (void (^)(UNNotificationContent *_Nonnull))
                           contentHandler {
  self.contentHandler = contentHandler;
  self.bestAttemptContent = [request.content mutableCopy];
  self.contentHandlerCalled = NO;

  dispatch_source_t memorySource = [self registerForMemoryEvents];

  if ([self shouldBeDecrypted:self.bestAttemptContent.userInfo]) {
    std::string decryptErrorMessage;
    try {
      @try {
        [self decryptBestAttemptContent];
      } @catch (NSException *e) {
        decryptErrorMessage = "NSE: Received Obj-C exception: " +
            std::string([e.name UTF8String]) +
            " during notification decryption.";
      } @catch (...) {
        @throw;
      }
    } catch (const std::exception &e) {
      decryptErrorMessage =
          "NSE: Received C++ exception: " + std::string(e.what()) +
          " during notification decryption.";
    }

    if (decryptErrorMessage.size()) {
      comm::Logger::log(decryptErrorMessage);
      [self callContentHandlerOnErrorMessage:
                [NSString stringWithUTF8String:decryptErrorMessage.c_str()]];
      return;
    }
  } else if ([self shouldAlertUnencryptedNotification:self.bestAttemptContent
                                                          .userInfo]) {
    // In future this will be replaced by notification content
    // modification for DEV environment and staff members
    comm::Logger::log("NSE: Received erroneously unencrypted notitication.");
  }

  std::string persistErrorMessage;
  try {
    @try {
      [self persistMessagePayload:self.bestAttemptContent.userInfo];
    } @catch (NSException *e) {
      persistErrorMessage =
          "NSE: Received Obj-C exception: " + std::string([e.name UTF8String]) +
          " during notification persistence.";
    } @catch (...) {
      @throw;
    }
  } catch (const std::exception &e) {
    persistErrorMessage =
        "NSE: Received C++ exception: " + std::string(e.what()) +
        " during notification persistence.";
  }

  if (persistErrorMessage.size()) {
    comm::Logger::log(persistErrorMessage);
    [self callContentHandlerOnErrorMessage:
              [NSString stringWithUTF8String:persistErrorMessage.c_str()]];
    return;
  }

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
        rescindErrorMessage = "NSE: Received Obj-C exception: " +
            std::string([e.name UTF8String]) + " during notification rescind.";
      } @catch (...) {
        @throw;
      }
    } catch (const std::exception &e) {
      rescindErrorMessage =
          "NSE: Received C++ exception: " + std::string(e.what()) +
          " during notification rescind.";
    }

    if (rescindErrorMessage.size()) {
      comm::Logger::log(rescindErrorMessage);
      [self callContentHandlerOnErrorMessage:
                [NSString stringWithUTF8String:rescindErrorMessage.c_str()]];
      return;
    }
    [self threadSafeContentHandlerCall:[[UNNotificationContent alloc] init]];
    return;
  }

  if ([self isBadgeOnly:self.bestAttemptContent.userInfo]) {
    UNMutableNotificationContent *badgeOnlyContent =
        [[UNMutableNotificationContent alloc] init];
    badgeOnlyContent.badge = self.bestAttemptContent.badge;
    [self threadSafeContentHandlerCall:badgeOnlyContent];
    return;
  }

  [self sendNewMessageInfosNotification];
  // TODO modify self.bestAttemptContent here
  [self unregisterForMemoryEventsFrom:memorySource];
  [self threadSafeContentHandlerCall:self.bestAttemptContent];
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

- (dispatch_source_t)registerForMemoryEvents {
  dispatch_source_t memorySource = dispatch_source_create(
      DISPATCH_SOURCE_TYPE_MEMORYPRESSURE,
      0L,
      DISPATCH_MEMORYPRESSURE_CRITICAL,
      dispatch_get_main_queue());

  __weak __typeof(self) weakSelf = self;
  dispatch_block_t eventHandler = ^{
    std::string criticalMemoryEventMessage =
        "NSE: Received CRITICAL memory event. Memory usage: " +
        std::to_string(getMemoryUsage());

    __typeof(weakSelf) strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }

    [strongSelf
        callContentHandlerOnErrorMessage:
            [NSString stringWithUTF8String:criticalMemoryEventMessage.c_str()]];
  };

  dispatch_source_set_event_handler(memorySource, eventHandler);
  dispatch_activate(memorySource);
  return memorySource;
}

- (void)unregisterForMemoryEventsFrom:(dispatch_source_t)source {
  dispatch_source_cancel(source);
}

- (void)callContentHandlerOnErrorMessage:(NSString *)errorMessage {
  UNMutableNotificationContent *content =
      [[UNMutableNotificationContent alloc] init];
  content.body = errorMessage;
  [self threadSafeContentHandlerCall:content];
}

- (void)threadSafeContentHandlerCall:(UNNotificationContent *)content {
  @synchronized(self) {
    if (self.contentHandlerCalled) {
      return;
    }
    self.contentHandlerCalled = YES;
    self.contentHandler(content);
  }
}

@end
