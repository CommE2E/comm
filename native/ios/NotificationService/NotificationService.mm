#import "NotificationService.h"
#import "Logger.h"
#import "NotificationsCryptoModule.h"
#import "StaffUtils.h"
#import "TemporaryMessageStorage.h"
#import <mach/mach.h>

NSString *const backgroundNotificationTypeKey = @"backgroundNotifType";
NSString *const messageInfosKey = @"messageInfos";
NSString *const encryptedPayloadKey = @"encryptedPayload";
NSString *const encryptionFailureKey = @"encryptionFailure";
NSString *const collapseIDKey = @"collapseID";
const std::string callingProcessName = "NSE";
// The context for this constant can be found here:
// https://linear.app/comm/issue/ENG-3074#comment-bd2f5e28
int64_t const notificationRemovalDelay = (int64_t)(0.1 * NSEC_PER_SEC);
CFStringRef newMessageInfosDarwinNotification =
    CFSTR("app.comm.darwin_new_message_infos");

// Implementation below was inspired by the
// following discussion with Apple staff member:
// https://developer.apple.com/forums/thread/105088
size_t getMemoryUsageInBytes() {
  task_vm_info_data_t vmInfo;
  mach_msg_type_number_t count = TASK_VM_INFO_COUNT;

  kern_return_t result =
      task_info(mach_task_self(), TASK_VM_INFO, (task_info_t)&vmInfo, &count);

  if (result != KERN_SUCCESS) {
    return -1;
  }

  size_t memory_usage = static_cast<size_t>(vmInfo.phys_footprint);
  return memory_usage;
}

@interface NotificationService ()

@property(strong) NSMutableDictionary *contentHandlers;
@property(strong) NSMutableDictionary *contents;

@end

@implementation NotificationService

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request
                   withContentHandler:
                       (void (^)(UNNotificationContent *_Nonnull))
                           contentHandler {
  // Set-up methods are idempotent
  [NotificationService setUpNSEProcess];
  [self setUpNSEInstance];

  NSString *contentHandlerKey = [request.identifier copy];
  UNMutableNotificationContent *content = [request.content mutableCopy];
  [self putContent:content withHandler:contentHandler forKey:contentHandlerKey];

  UNNotificationContent *publicUserContent = content;

  // Step 1: notification decryption.
  if ([self shouldBeDecrypted:content.userInfo]) {
    std::string decryptErrorMessage;
    try {
      @try {
        [self decryptContentInPlace:content];
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
      [self callContentHandlerForKey:contentHandlerKey
                      onErrorMessage:errorMessage
               withPublicUserContent:[[UNNotificationContent alloc] init]];
      return;
    }
  } else if ([self shouldAlertUnencryptedNotification:content.userInfo]) {
    // In future this will be replaced by notification content
    // modification for DEV environment and staff members
    comm::Logger::log("NSE: Received erroneously unencrypted notitication.");
  }

  NSMutableArray *errorMessages = [[NSMutableArray alloc] init];

  // Step 2: notification persistence in a temporary storage
  std::string persistErrorMessage;
  try {
    @try {
      [self persistMessagePayload:content.userInfo];
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
    [errorMessages
        addObject:[NSString stringWithUTF8String:persistErrorMessage.c_str()]];
  }

  // Step 3: (optional) rescind read notifications

  // Message payload persistence is a higher priority task, so it has
  // to happen prior to potential notification center clearing.
  if ([self isRescind:content.userInfo]) {
    std::string rescindErrorMessage;
    try {
      @try {
        [self removeNotificationsWithCondition:^BOOL(
                  UNNotification *_Nonnull notif) {
          return [content.userInfo[@"notificationId"]
              isEqualToString:notif.request.content.userInfo[@"id"]];
        }];
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
      [errorMessages
          addObject:[NSString
                        stringWithUTF8String:persistErrorMessage.c_str()]];
    }

    publicUserContent = [[UNNotificationContent alloc] init];
  }

  // Step 4: (optional) execute notification coalescing
  if ([self isCollapsible:content.userInfo]) {
    std::string coalescingErrorMessage;
    try {
      @try {
        [self removeNotificationsWithCondition:^BOOL(
                  UNNotification *_Nonnull notif) {
          return [content.userInfo[collapseIDKey]
                     isEqualToString:notif.request.content
                                         .userInfo[collapseIDKey]] ||
              [content.userInfo[collapseIDKey]
                     isEqualToString:notif.request.identifier];
        }];
      } @catch (NSException *e) {
        coalescingErrorMessage =
            "Obj-C exception: " + std::string([e.name UTF8String]) +
            " during notification coalescing.";
      }
    } catch (const std::exception &e) {
      coalescingErrorMessage = "C++ exception: " + std::string(e.what()) +
          " during notification coalescing.";
    }
  }

  // Step 5: (optional) create empty notification that
  // only provides badge count.
  if ([self isBadgeOnly:content.userInfo]) {
    UNMutableNotificationContent *badgeOnlyContent =
        [[UNMutableNotificationContent alloc] init];
    badgeOnlyContent.badge = content.badge;
    content = badgeOnlyContent;
    publicUserContent = badgeOnlyContent;
  }

  // Step 5: notify main app that there is data
  // to transfer to SQLite and redux.
  [self sendNewMessageInfosNotification];

  if (NSString *currentMemoryEventMessage =
          [NotificationService getAndSetMemoryEventMessage:nil]) {
    [errorMessages addObject:currentMemoryEventMessage];
  }

  if (errorMessages.count) {
    NSString *cumulatedErrorMessage = [@"NSE: Received "
        stringByAppendingString:[errorMessages componentsJoinedByString:@" "]];
    [self callContentHandlerForKey:contentHandlerKey
                    onErrorMessage:cumulatedErrorMessage
             withPublicUserContent:publicUserContent];
    return;
  }
  [self callContentHandlerForKey:contentHandlerKey
                     withContent:publicUserContent];
}

- (void)serviceExtensionTimeWillExpire {
  // Called just before the extension will be terminated by the system.
  // Use this as an opportunity to deliver your "best attempt" at modified
  // content, otherwise the original push payload will be used.
  NSMutableArray<void (^)(UNNotificationContent *_Nonnull)> *allHandlers =
      [[NSMutableArray alloc] init];
  NSMutableArray<UNNotificationContent *> *allContents =
      [[NSMutableArray alloc] init];

  @synchronized(self.contentHandlers) {
    for (NSString *key in self.contentHandlers) {
      [allHandlers addObject:self.contentHandlers[key]];
      [allContents addObject:self.contents[key]];
    }

    [self.contentHandlers removeAllObjects];
    [self.contents removeAllObjects];
  }

  for (int i = 0; i < allContents.count; i++) {
    UNNotificationContent *content = allContents[i];
    void (^handler)(UNNotificationContent *_Nonnull) = allHandlers[i];

    if ([self isRescind:content.userInfo]) {
      // If we get to this place it means we were unable to
      // remove relevant notification from notification center in
      // in time given to NSE to process notification.
      // It is an extremely unlikely to happen.
      if (!comm::StaffUtils::isStaffRelease()) {
        handler([[UNNotificationContent alloc] init]);
        continue;
      }

      NSString *errorMessage =
          @"NSE: Exceeded time limit to rescind a notification.";
      UNNotificationContent *errorContent =
          [self buildContentForError:errorMessage];
      handler(errorContent);
      continue;
    }

    if ([self shouldBeDecrypted:content.userInfo] &&
        !content.userInfo[@"succesfullyDecrypted"]) {
      // If we get to this place it means we were unable to
      // decrypt encrypted notification content in time
      // given to NSE to process notification.
      if (!comm::StaffUtils::isStaffRelease()) {
        handler([[UNNotificationContent alloc] init]);
        continue;
      }

      NSString *errorMessage =
          @"NSE: Exceeded time limit to decrypt a notification.";
      UNNotificationContent *errorContent =
          [self buildContentForError:errorMessage];
      handler(errorContent);
      continue;
    }

    // At this point we know that the content is at least
    // correctly decrypted so we can display it to the user.
    // Another operation, like persistence, had failed.
    if ([self isBadgeOnly:content.userInfo]) {
      UNNotificationContent *badgeOnlyContent =
          [self getBadgeOnlyContentFor:content];
      handler(badgeOnlyContent);
      continue;
    }

    handler(content);
  }
}

- (void)removeNotificationsWithCondition:
    (BOOL (^)(UNNotification *_Nonnull))condition {
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
        NSMutableArray<NSString *> *notificationsToRemove =
            [[NSMutableArray alloc] init];
        for (UNNotification *notif in notifications) {
          if (condition(notif)) {
            [notificationsToRemove addObject:notif.request.identifier];
          }
        }
        [UNUserNotificationCenter.currentNotificationCenter
            removeDeliveredNotificationsWithIdentifiers:notificationsToRemove];
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

- (BOOL)isCollapsible:(NSDictionary *)payload {
  return payload[collapseIDKey];
}

- (UNNotificationContent *)getBadgeOnlyContentFor:
    (UNNotificationContent *)content {
  UNMutableNotificationContent *badgeOnlyContent =
      [[UNMutableNotificationContent alloc] init];
  badgeOnlyContent.badge = content.badge;
  return badgeOnlyContent;
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

- (void)decryptContentInPlace:(UNMutableNotificationContent *)content {
  NSString *decryptedSerializedPayload =
      [self singleDecrypt:content.userInfo[encryptedPayloadKey]];
  NSDictionary *decryptedPayload = [NSJSONSerialization
      JSONObjectWithData:[decryptedSerializedPayload
                             dataUsingEncoding:NSUTF8StringEncoding]
                 options:0
                   error:nil];

  NSMutableDictionary *mutableUserInfo = [content.userInfo mutableCopy];

  NSMutableDictionary *mutableAps = nil;
  if (mutableUserInfo[@"aps"]) {
    mutableAps = [mutableUserInfo[@"aps"] mutableCopy];
  }

  NSString *body = decryptedPayload[@"merged"];
  if (body) {
    content.body = body;
    if (mutableAps && mutableAps[@"alert"]) {
      mutableAps[@"alert"] = body;
    }
  }

  NSString *threadID = decryptedPayload[@"threadID"];
  if (threadID) {
    content.threadIdentifier = threadID;
    mutableUserInfo[@"threadID"] = threadID;
    if (mutableAps) {
      mutableAps[@"thread-id"] = threadID;
    }
  }

  NSString *badgeStr = decryptedPayload[@"badge"];
  if (badgeStr) {
    NSNumber *badge = @([badgeStr intValue]);
    content.badge = badge;
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
  content.userInfo = mutableUserInfo;
}

// Apple documentation for NSE does not explicitly state
// that single NSE instance will be used by only one thread
// at a time. Even though UNNotificationServiceExtension API
// suggests that it could be the case we don't trust it
// and keep a synchronized collection of handlers and contents.
// We keep reports of events that strongly suggest there is
// parallelism in notifications processing. In particular we
// have see notifications not being decrypted when access
// to encryption keys had not been correctly implemented.
// Similar behaviour is adopted by other apps such as Signal,
// Telegram or Element.

- (void)setUpNSEInstance {
  @synchronized(self) {
    if (self.contentHandlers) {
      return;
    }
    self.contentHandlers = [[NSMutableDictionary alloc] init];
    self.contents = [[NSMutableDictionary alloc] init];
  }
}

- (void)putContent:(UNNotificationContent *)content
       withHandler:(void (^)(UNNotificationContent *_Nonnull))handler
            forKey:(NSString *)key {
  @synchronized(self.contentHandlers) {
    [self.contentHandlers setObject:handler forKey:key];
    [self.contents setObject:content forKey:key];
  }
}

- (void)callContentHandlerForKey:(NSString *)key
                     withContent:(UNNotificationContent *)content {
  void (^handler)(UNNotificationContent *_Nonnull);

  @synchronized(self.contentHandlers) {
    handler = [self.contentHandlers objectForKey:key];
    [self.contentHandlers removeObjectForKey:key];
    [self.contents removeObjectForKey:key];
  }

  if (!handler) {
    return;
  }
  handler(content);
}

- (UNNotificationContent *)buildContentForError:(NSString *)error {
  UNMutableNotificationContent *content =
      [[UNMutableNotificationContent alloc] init];
  content.body = error;
  return content;
}

- (void)callContentHandlerForKey:(NSString *)key
                  onErrorMessage:(NSString *)errorMessage
           withPublicUserContent:(UNNotificationContent *)publicUserContent {
  comm::Logger::log(std::string([errorMessage UTF8String]));

  if (!comm::StaffUtils::isStaffRelease()) {
    [self callContentHandlerForKey:key withContent:publicUserContent];
    return;
  }

  UNNotificationContent *content = [self buildContentForError:errorMessage];
  [self callContentHandlerForKey:key withContent:content];
}

// Monitor memory usage
+ (NSString *)getAndSetMemoryEventMessage:(NSString *)message {
  static NSString *memoryEventMessage = nil;
  static NSLock *memoryEventLock = [[NSLock alloc] init];

  @try {
    if (![memoryEventLock tryLock]) {
      return nil;
    }
    NSString *currentMemoryEventMessage =
        memoryEventMessage ? [memoryEventMessage copy] : nil;
    memoryEventMessage = [message copy];
    return currentMemoryEventMessage;
  } @finally {
    [memoryEventLock unlock];
  }
}

+ (dispatch_source_t)registerForMemoryEvents {
  dispatch_source_t memorySource = dispatch_source_create(
      DISPATCH_SOURCE_TYPE_MEMORYPRESSURE,
      0L,
      DISPATCH_MEMORYPRESSURE_CRITICAL,
      dispatch_get_main_queue());

  dispatch_block_t eventHandler = ^{
    NSString *criticalMemoryEventMessage = [NSString
        stringWithFormat:
            @"NSE: Received CRITICAL memory event. Memory usage: %ld bytes",
            getMemoryUsageInBytes()];

    comm::Logger::log(std::string([criticalMemoryEventMessage UTF8String]));
    if (!comm::StaffUtils::isStaffRelease()) {
      // If it is not a staff release we don't set
      // memoryEventMessage variable since it will
      // not be displayed to the client anyway
      return;
    }

    [NotificationService
        getAndSetMemoryEventMessage:criticalMemoryEventMessage];
  };

  dispatch_source_set_event_handler(memorySource, eventHandler);
  dispatch_activate(memorySource);
  return memorySource;
}

+ (void)setUpNSEProcess {
  static dispatch_source_t memoryEventSource;
  static dispatch_once_t onceToken;

  dispatch_once(&onceToken, ^{
    memoryEventSource = [NotificationService registerForMemoryEvents];
  });
}

@end
