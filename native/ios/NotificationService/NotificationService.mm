#import "NotificationService.h"
#import "CommIOSNotificationsBlobClient.h"
#import "Logger.h"
#import "NotificationsCryptoModule.h"
#import "TemporaryMessageStorage.h"
#import <CommExpoPackage/CommExpoPackageObjCCompat.h>

NSString *const backgroundNotificationTypeKey = @"backgroundNotifType";
NSString *const messageInfosKey = @"messageInfos";
NSString *const encryptedPayloadKey = @"encryptedPayload";
NSString *const encryptionFailureKey = @"encryptionFailure";
NSString *const blobHashKey = @"blobHash";
NSString *const requestBlobHashKey = @"blob_hash";
NSString *const holderKey = @"holder";
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
@property(class, nonatomic, strong, readonly)
    AESCryptoModuleObjCCompat *processLocalAESCryptoModule;
@end

@implementation NotificationService

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request
                   withContentHandler:
                       (void (^)(UNNotificationContent *_Nonnull))
                           contentHandler {
  [NotificationService initializeProcessLocalObjects];

  self.contentHandler = contentHandler;
  self.bestAttemptContent = [request.content mutableCopy];

  if ([self shouldBeDecrypted:self.bestAttemptContent.userInfo]) {
    @try {
      [self decryptBestAttemptContent];
    } @catch (NSException *e) {
      comm::Logger::log(
          "NSE: Received exception: " + std::string([e.name UTF8String]) +
          " with reason: " + std::string([e.reason UTF8String]) +
          " during notification decryption");
      self.contentHandler([[UNNotificationContent alloc] init]);
      return;
    }
  } else if ([self shouldAlertUnencryptedNotification:self.bestAttemptContent
                                                          .userInfo]) {
    // In future this will be replaced by notification content
    // modification for DEV environment and staff members
    comm::Logger::log("NSE: Received erroneously unencrypted notitication.");
  }

  if ([self isBlobNotification:self.bestAttemptContent.userInfo]) {
    NSString *blobHash = self.bestAttemptContent.userInfo[blobHashKey];
    NSData *encryptionKey = [[NSData alloc]
        initWithBase64EncodedString:self.bestAttemptContent
                                        .userInfo[@"encryptionKey"]
                            options:0];
    [[CommIOSNotificationsBlobClient sharedInstance]
          getAndConsumeSync:blobHash
        withSuccessConsumer:^(NSData *data) {
          @try {
            NSDictionary *largePayload =
                [NotificationService aesDecryptAndParse:data
                                                withKey:encryptionKey];
            [NotificationService persistMessagePayload:largePayload];
            [NotificationService sendNewMessageInfosNotification];
          } @catch (NSException *e) {
            comm::Logger::log(
                "NSE: Received exception: " + std::string([e.name UTF8String]) +
                " with reason: " + std::string([e.reason UTF8String]) +
                " during large notification payload processing");
          }
        }];

    [NotificationService
        persistBlobMetadataForDeletion:self.bestAttemptContent.userInfo];
    self.contentHandler(self.bestAttemptContent);
    return;
  }

  [NotificationService persistMessagePayload:self.bestAttemptContent.userInfo];
  // Message payload persistence is a higher priority task, so it has
  // to happen prior to potential notification center clearing.
  if ([NotificationService isRescind:self.bestAttemptContent.userInfo]) {
    [self removeNotificationWithIdentifier:self.bestAttemptContent
                                               .userInfo[@"notificationId"]];
    self.contentHandler([[UNNotificationContent alloc] init]);
    return;
  }

  if ([self isBadgeOnly:self.bestAttemptContent.userInfo]) {
    UNMutableNotificationContent *badgeOnlyContent =
        [[UNMutableNotificationContent alloc] init];
    badgeOnlyContent.badge = self.bestAttemptContent.badge;
    self.contentHandler(badgeOnlyContent);
    return;
  }

  [NotificationService sendNewMessageInfosNotification];
  // TODO modify self.bestAttemptContent here

  self.contentHandler(self.bestAttemptContent);
}

- (void)serviceExtensionTimeWillExpire {
  // Called just before the extension will be terminated by the system.
  // Use this as an opportunity to deliver your "best attempt" at modified
  // content, otherwise the original push payload will be used.
  if ([NotificationService isRescind:self.bestAttemptContent.userInfo]) {
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

+ (void)persistMessagePayload:(NSDictionary *)payload {
  if (payload[messageInfosKey]) {
    TemporaryMessageStorage *temporaryStorage =
        [[TemporaryMessageStorage alloc] init];
    [temporaryStorage writeMessage:payload[messageInfosKey]];
    return;
  }

  if (![NotificationService isRescind:payload]) {
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

+ (void)persistBlobMetadataForDeletion:(NSDictionary *)payload {
  NSString *blobHash = payload[blobHashKey];
  NSString *holder = payload[holderKey];

  TemporaryMessageStorage *temporaryMessageStorageBlobs =
      [[TemporaryMessageStorage alloc] initForBlobs];

  [temporaryMessageStorageBlobs
      writeMessage:[[NSString alloc]
                       initWithData:[NSJSONSerialization dataWithJSONObject:@{
                         requestBlobHashKey : blobHash,
                         holderKey : holder
                       }
                                                                    options:0
                                                                      error:nil]
                           encoding:NSUTF8StringEncoding]];
}

+ (BOOL)isRescind:(NSDictionary *)payload {
  return payload[backgroundNotificationTypeKey] &&
      [payload[backgroundNotificationTypeKey] isEqualToString:@"CLEAR"];
}

- (BOOL)isBadgeOnly:(NSDictionary *)payload {
  // TODO: refactor this check by introducing
  // badgeOnly property in iOS notification payload
  return !payload[@"threadID"];
}

- (BOOL)isBlobNotification:(NSDictionary *)payload {
  return payload[blobHashKey] && payload[holderKey];
}

+ (void)sendNewMessageInfosNotification {
  CFNotificationCenterPostNotification(
      CFNotificationCenterGetDarwinNotifyCenter(),
      newMessageInfosDarwinNotification,
      nil,
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

// Process-local initialization code
// NSE may use different threads and instancess
// of this class to process notifications, but it
// usually keeps the same process for extended
// period of time. Objects that can be initialized
// once and reused on each notification should be
// declared in a method below to avoid unnecessary
// resource usage.

static AESCryptoModuleObjCCompat *_aesCryptoModule = nil;

+ (void)initializeProcessLocalObjects {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    _aesCryptoModule = [[AESCryptoModuleObjCCompat alloc] init];
  });
}

+ (AESCryptoModuleObjCCompat *)processLocalAESCryptoModule {
  return _aesCryptoModule;
}

@end
