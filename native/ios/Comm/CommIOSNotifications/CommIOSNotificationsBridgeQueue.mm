#import "CommIOSNotificationsBridgeQueue.h"

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

- (void)putNotification:(NSDictionary *)notifInfo {
  if (!commNotificationsQueue) {
    return;
  }
  [commNotificationsQueue addObject:notifInfo];
}

- (void)processNotifications:(void (^)(NSDictionary *))block {
  if (!commNotificationsQueue) {
    return;
  }
  for (id notifInfo in commNotificationsQueue) {
    block(notifInfo);
  }
  commNotificationsQueue = nil;
}

@end
