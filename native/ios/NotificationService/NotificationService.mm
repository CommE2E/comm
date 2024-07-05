#import "NotificationService.h"
#import "AESCryptoModuleObjCCompat.h"
#import "CommIOSServicesClient.h"
#import "CommMMKV.h"
#import "Logger.h"
#import "NotificationsCryptoModule.h"
#import "StaffUtils.h"
#import "TemporaryMessageStorage.h"
#import <mach/mach.h>
#include <iterator>
#include <sstream>

NSString *const backgroundNotificationTypeKey = @"backgroundNotifType";
NSString *const messageInfosKey = @"messageInfos";
NSString *const encryptedPayloadKey = @"encryptedPayload";
NSString *const encryptionFailureKey = @"encryptionFailure";
NSString *const collapseIDKey = @"collapseID";
NSString *const keyserverIDKey = @"keyserverID";
NSString *const blobHashKey = @"blobHash";
NSString *const blobHolderKey = @"blobHolder";
NSString *const encryptionKeyLabel = @"encryptionKey";
NSString *const needsSilentBadgeUpdateKey = @"needsSilentBadgeUpdate";

// Those and future MMKV-related constants should match
// similar constants in CommNotificationsHandler.java
const std::string mmkvKeySeparator = ".";
const std::string mmkvKeyserverPrefix = "KEYSERVER";
const std::string mmkvUnreadCountSuffix = "UNREAD_COUNT";

// The context for this constant can be found here:
// https://linear.app/comm/issue/ENG-3074#comment-bd2f5e28
int64_t const notificationRemovalDelay = (int64_t)(0.1 * NSEC_PER_SEC);
// Apple gives us about 30 seconds to process single notification,
// se we let any semaphore wait for at most 20 seconds
int64_t const semaphoreAwaitTimeLimit = (int64_t)(20 * NSEC_PER_SEC);

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

std::string joinStrings(
    const std::string &separator,
    const std::vector<std::string> &array) {
  std::ostringstream joinedStream;
  std::copy(
      array.begin(),
      array.end(),
      std::ostream_iterator<std::string>(joinedStream, separator.c_str()));
  std::string joined = joinedStream.str();
  return joined.empty() ? joined : joined.substr(0, joined.size() - 1);
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
  std::unique_ptr<comm::NotificationsCryptoModule::BaseStatefulDecryptResult>
      statefulDecryptResultPtr;
  BOOL decryptionExecuted = NO;

  if ([self shouldBeDecrypted:content.userInfo]) {
    std::optional<std::string> notifID;
    NSString *objcNotifID = content.userInfo[@"id"];
    if (objcNotifID) {
      notifID = std::string([objcNotifID UTF8String]);
    }

    std::string decryptErrorMessage;
    try {
      @try {
        statefulDecryptResultPtr = [self decryptContentInPlace:content];
        decryptionExecuted = YES;
      } @catch (NSException *e) {
        decryptErrorMessage = "NSE: Received Obj-C exception: " +
            std::string([e.name UTF8String]) +
            " during notification decryption.";
        if (notifID.has_value()) {
          decryptErrorMessage += " Notif ID: " + notifID.value();
        }
      }
    } catch (const std::exception &e) {
      decryptErrorMessage =
          "NSE: Received C++ exception: " + std::string(e.what()) +
          " during notification decryption.";
      if (notifID.has_value()) {
        decryptErrorMessage += " Notif ID: " + notifID.value();
      }
    }

    if (decryptErrorMessage.size()) {
      NSString *errorMessage =
          [NSString stringWithUTF8String:decryptErrorMessage.c_str()];
      if (notifID.has_value() &&
          [self isAppShowingNotificationWith:
                    [NSString stringWithCString:notifID.value().c_str()
                                       encoding:NSUTF8StringEncoding]]) {
        errorMessage = [errorMessage
            stringByAppendingString:@" App shows notif with this ID."];
      }

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

  // Step 3: Cumulative unread count calculation
  if (content.badge) {
    std::string unreadCountCalculationError;
    try {
      @try {
        [self calculateTotalUnreadCountInPlace:content];
      } @catch (NSException *e) {
        unreadCountCalculationError =
            "Obj-C exception: " + std::string([e.name UTF8String]) +
            " during unread count calculation.";
      }
    } catch (const std::exception &e) {
      unreadCountCalculationError = "C++ exception: " + std::string(e.what()) +
          " during unread count calculation.";
    }

    if (unreadCountCalculationError.size() &&
        comm::StaffUtils::isStaffRelease()) {
      [errorMessages
          addObject:[NSString stringWithUTF8String:unreadCountCalculationError
                                                       .c_str()]];
    }
  }

  // Step 4: (optional) rescind read notifications

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

  // Step 5: (optional) execute notification coalescing
  if ([self isCollapsible:content.userInfo]) {
    std::string coalescingErrorMessage;
    try {
      @try {
        [self displayLocalNotificationFromContent:content
                                   forCollapseKey:content
                                                      .userInfo[collapseIDKey]];
      } @catch (NSException *e) {
        coalescingErrorMessage =
            "Obj-C exception: " + std::string([e.name UTF8String]) +
            " during notification coalescing.";
      }
    } catch (const std::exception &e) {
      coalescingErrorMessage = "C++ exception: " + std::string(e.what()) +
          " during notification coalescing.";
    }

    if (coalescingErrorMessage.size()) {
      [errorMessages
          addObject:[NSString
                        stringWithUTF8String:coalescingErrorMessage.c_str()]];
      // Even if we fail to execute coalescing then public users
      // should still see the original message.
      publicUserContent = content;
    } else {
      publicUserContent = [[UNNotificationContent alloc] init];
    }
  }

  // Step 6: (optional) create empty notification that
  // only provides badge count.

  // For notifs that only contain badge update the
  // server sets BODY to "ENCRYPTED" for internal
  // builds for debugging purposes. So instead of
  // letting such notif go through, we construct
  // another notif that doesn't have a body.
  if (content.userInfo[needsSilentBadgeUpdateKey]) {
    publicUserContent = [self getBadgeOnlyContentFor:content];
  }

  // Step 7: (optional) download notification paylaod
  // from blob service in case it is large notification
  if ([self isLargeNotification:content.userInfo]) {
    std::string processLargeNotificationError;
    try {
      @try {
        [self fetchAndPersistLargeNotifPayload:content];
      } @catch (NSException *e) {
        processLargeNotificationError =
            "Obj-C exception: " + std::string([e.name UTF8String]) +
            " during large notification processing.";
      }
    } catch (const std::exception &e) {
      processLargeNotificationError =
          "C++ exception: " + std::string(e.what()) +
          " during large notification processing.";
    }

    if (processLargeNotificationError.size()) {
      [errorMessages
          addObject:[NSString stringWithUTF8String:processLargeNotificationError
                                                       .c_str()]];
    }
  }

  // Step 8: notify main app that there is data
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

  if (decryptionExecuted) {
    comm::NotificationsCryptoModule::flushState(
        std::move(statefulDecryptResultPtr));
  }
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

    if ([self isCollapsible:content.userInfo]) {
      // If we get to this place it means we were unable to
      // execute notification coalescing with local notification
      // mechanism in time given to NSE to process notification.
      if (!comm::StaffUtils::isStaffRelease()) {
        handler(content);
        continue;
      }

      NSString *errorMessage =
          @"NSE: Exceeded time limit to collapse a notitication.";
      UNNotificationContent *errorContent =
          [self buildContentForError:errorMessage];
      handler(errorContent);
      continue;
    }

    if ([self shouldBeDecrypted:content.userInfo] &&
        !content.userInfo[@"successfullyDecrypted"]) {
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
    if (content.userInfo[needsSilentBadgeUpdateKey]) {
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

  dispatch_semaphore_wait(
      semaphore, dispatch_time(DISPATCH_TIME_NOW, semaphoreAwaitTimeLimit));
}

- (void)displayLocalNotificationFromContent:(UNNotificationContent *)content
                             forCollapseKey:(NSString *)collapseKey {
  UNMutableNotificationContent *localNotifContent =
      [[UNMutableNotificationContent alloc] init];

  localNotifContent.title = content.title;
  localNotifContent.body = content.body;
  localNotifContent.badge = content.badge;
  localNotifContent.userInfo = content.userInfo;

  UNNotificationRequest *localNotifRequest =
      [UNNotificationRequest requestWithIdentifier:collapseKey
                                           content:localNotifContent
                                           trigger:nil];

  [self displayLocalNotificationFor:localNotifRequest];
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

- (void)calculateTotalUnreadCountInPlace:
    (UNMutableNotificationContent *)content {
  if (!content.userInfo[keyserverIDKey]) {
    throw std::runtime_error("Received badge update without keyserver ID.");
  }
  std::string senderKeyserverID =
      std::string([content.userInfo[keyserverIDKey] UTF8String]);

  std::string senderKeyserverUnreadCountKey = joinStrings(
      mmkvKeySeparator,
      {mmkvKeyserverPrefix, senderKeyserverID, mmkvUnreadCountSuffix});

  int senderKeyserverUnreadCount = [content.badge intValue];
  comm::CommMMKV::setInt(
      senderKeyserverUnreadCountKey, senderKeyserverUnreadCount);

  int totalUnreadCount = 0;
  std::vector<std::string> allKeys = comm::CommMMKV::getAllKeys();
  for (const auto &key : allKeys) {
    if (key.size() <
            mmkvKeyserverPrefix.size() + mmkvUnreadCountSuffix.size() ||
        key.compare(0, mmkvKeyserverPrefix.size(), mmkvKeyserverPrefix) ||
        key.compare(
            key.size() - mmkvUnreadCountSuffix.size(),
            mmkvUnreadCountSuffix.size(),
            mmkvUnreadCountSuffix)) {
      continue;
    }

    std::optional<int> unreadCount = comm::CommMMKV::getInt(key, -1);
    if (!unreadCount.has_value()) {
      continue;
    }
    totalUnreadCount += unreadCount.value();
  }

  content.badge = @(totalUnreadCount);
}

- (void)fetchAndPersistLargeNotifPayload:
    (UNMutableNotificationContent *)content {
  NSString *blobHash = content.userInfo[blobHashKey];

  NSData *encryptionKey = [[NSData alloc]
      initWithBase64EncodedString:content.userInfo[encryptionKeyLabel]
                          options:0];

  __block NSError *fetchError = nil;
  NSData *largePayloadBinary =
      [CommIOSServicesClient.sharedInstance getBlobSync:blobHash
                                             orSetError:&fetchError];

  if (fetchError) {
    comm::Logger::log(
        "Failed to fetch notif payload from blob service. Details: " +
        std::string([fetchError.localizedDescription UTF8String]));
    return;
  }

  NSDictionary *largePayload =
      [NotificationService aesDecryptAndParse:largePayloadBinary
                                      withKey:encryptionKey];
  [self persistMessagePayload:largePayload];
  [CommIOSServicesClient.sharedInstance
      storeBlobForDeletionWithHash:blobHash
                         andHolder:content.userInfo[blobHolderKey]];
}

- (BOOL)isCollapsible:(NSDictionary *)payload {
  return payload[collapseIDKey];
}

- (BOOL)isLargeNotification:(NSDictionary *)payload {
  return payload[blobHashKey] && payload[encryptionKeyLabel] &&
      payload[blobHolderKey];
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

- (std::unique_ptr<comm::NotificationsCryptoModule::BaseStatefulDecryptResult>)
    decryptContentInPlace:(UNMutableNotificationContent *)content {
  std::string encryptedData =
      std::string([content.userInfo[encryptedPayloadKey] UTF8String]);

  if (!content.userInfo[keyserverIDKey]) {
    throw std::runtime_error(
        "Received encrypted notification without keyserverID.");
  }
  std::string senderKeyserverID =
      std::string([content.userInfo[keyserverIDKey] UTF8String]);

  auto decryptResult = comm::NotificationsCryptoModule::statefulDecrypt(
      senderKeyserverID,
      encryptedData,
      comm::NotificationsCryptoModule::olmEncryptedTypeMessage);

  NSString *decryptedSerializedPayload =
      [NSString stringWithUTF8String:decryptResult->getDecryptedData().c_str()];

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
  } else {
    mutableUserInfo[needsSilentBadgeUpdateKey] = @(YES);
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
  mutableUserInfo[@"successfullyDecrypted"] = @(YES);
  content.userInfo = mutableUserInfo;

  return decryptResult;
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

  if (comm::StaffUtils::isStaffRelease()) {
    NSString *errorNotifId = [@"error_for_" stringByAppendingString:key];
    UNNotificationContent *content = [self buildContentForError:errorMessage];
    UNNotificationRequest *localNotifRequest =
        [UNNotificationRequest requestWithIdentifier:errorNotifId
                                             content:content
                                             trigger:nil];
    [self displayLocalNotificationFor:localNotifRequest];
  }

  [self callContentHandlerForKey:key withContent:publicUserContent];
}

- (void)displayLocalNotificationFor:(UNNotificationRequest *)localNotifRequest {
  // We must wait until local notif display completion
  // handler returns. Context:
  // https://developer.apple.com/forums/thread/108340?answerId=331640022#331640022

  dispatch_semaphore_t localNotifDisplaySemaphore =
      dispatch_semaphore_create(0);

  __block NSError *localNotifDisplayError = nil;
  [UNUserNotificationCenter.currentNotificationCenter
      addNotificationRequest:localNotifRequest
       withCompletionHandler:^(NSError *_Nullable error) {
         if (error) {
           localNotifDisplayError = error;
         }
         dispatch_semaphore_signal(localNotifDisplaySemaphore);
       }];

  dispatch_semaphore_wait(
      localNotifDisplaySemaphore,
      dispatch_time(DISPATCH_TIME_NOW, semaphoreAwaitTimeLimit));

  if (localNotifDisplayError) {
    throw std::runtime_error(
        std::string([localNotifDisplayError.localizedDescription UTF8String]));
  }
}

- (BOOL)isAppShowingNotificationWith:(NSString *)identifier {
  dispatch_semaphore_t getAllDeliveredNotifsSemaphore =
      dispatch_semaphore_create(0);

  __block BOOL foundNotification = NO;
  [UNUserNotificationCenter.currentNotificationCenter
      getDeliveredNotificationsWithCompletionHandler:^(
          NSArray<UNNotification *> *_Nonnull notifications) {
        for (UNNotification *notif in notifications) {
          if (notif.request.content.userInfo[@"id"] &&
              [notif.request.content.userInfo[@"id"]
                  isEqualToString:identifier]) {
            foundNotification = YES;
            break;
          }
        }
        dispatch_semaphore_signal(getAllDeliveredNotifsSemaphore);
      }];

  dispatch_semaphore_wait(
      getAllDeliveredNotifsSemaphore,
      dispatch_time(DISPATCH_TIME_NOW, semaphoreAwaitTimeLimit));

  return foundNotification;
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

// AES Cryptography
static AESCryptoModuleObjCCompat *_aesCryptoModule = nil;

+ (AESCryptoModuleObjCCompat *)processLocalAESCryptoModule {
  return _aesCryptoModule;
}

+ (NSDictionary *)aesDecryptAndParse:(NSData *)sealedData
                             withKey:(NSData *)key {
  NSError *decryptError = nil;
  NSInteger destinationLength =
      [[NotificationService processLocalAESCryptoModule]
          decryptedLength:sealedData];

  NSMutableData *destination = [NSMutableData dataWithLength:destinationLength];
  [[NotificationService processLocalAESCryptoModule]
      decryptWithKey:key
          sealedData:sealedData
         destination:destination
           withError:&decryptError];

  if (decryptError) {
    comm::Logger::log(
        "NSE: Notification aes decryption failure. Details: " +
        std::string([decryptError.localizedDescription UTF8String]));
    return nil;
  }

  NSString *decryptedSerializedPayload =
      [[NSString alloc] initWithData:destination encoding:NSUTF8StringEncoding];

  return [NSJSONSerialization
      JSONObjectWithData:[decryptedSerializedPayload
                             dataUsingEncoding:NSUTF8StringEncoding]
                 options:0
                   error:nil];
}

// Process-local initialization code NSE may use different threads and instances
// of this class to process notifs, but it usually keeps the same process for
// extended period of time. Objects that can be initialized once and reused on
// each notif should be declared in a method below to avoid wasting resources

+ (void)setUpNSEProcess {
  static dispatch_source_t memoryEventSource;
  static dispatch_once_t onceToken;

  dispatch_once(&onceToken, ^{
    _aesCryptoModule = [[AESCryptoModuleObjCCompat alloc] init];
    memoryEventSource = [NotificationService registerForMemoryEvents];
  });
}

@end
