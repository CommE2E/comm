#import "CommIOSNotificationsBridgeQueue.h"

static NSString *const notificationInfoKey = @"notificationInfo";
static NSString *const notificationNameKey = @"notificationName";

@implementation CommIOSNotificationsBridgeQueue

NSMutableArray<NSDictionary *> *commNotificationsQueue;

+ (nonnull instancetype)sharedInstance {
  static CommIOSNotificationsBridgeQueue *sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [self new];
  });

  return sharedInstance;
}

- (instancetype)init {
  commNotificationsQueue = [NSMutableArray new];
  self.jsReady = NO;
  return self;
}

- (void)putNotification:(NSDictionary *)notifInfo
               withName:(NSNotificationName)name {
  if (!commNotificationsQueue) {
    return;
  }

  NSDictionary *queueEntry = @{
    notificationInfoKey : notifInfo,
    notificationNameKey : name,
  };
  [commNotificationsQueue addObject:queueEntry];
}

- (void)processNotifications:
    (void (^)(NSDictionary *, NSNotificationName))block {
  if (!commNotificationsQueue) {
    return;
  }
  for (NSDictionary *queueEntry in commNotificationsQueue) {
    block(queueEntry[notificationInfoKey], queueEntry[notificationNameKey]);
  }
  commNotificationsQueue = nil;
}

@end
