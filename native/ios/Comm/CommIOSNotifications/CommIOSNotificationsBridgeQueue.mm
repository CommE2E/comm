#import "CommIOSNotificationsBridgeQueue.h"

@implementation CommIOSNotificationsBridgeQueue

NSMutableArray<NSDictionary *> *actionsQueue;
NSMutableArray<NSDictionary *> *notificationsQueue;
NSMutableDictionary *actionCompletionHandlers;

+ (nonnull instancetype)sharedInstance {
  static CommIOSNotificationsBridgeQueue *sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [self new];
  });

  return sharedInstance;
}

- (instancetype)init {
  actionsQueue = [NSMutableArray new];
  notificationsQueue = [NSMutableArray new];
  actionCompletionHandlers = [NSMutableDictionary new];
  self.jsIsReady = NO;

  return self;
}

- (void)postNotification:(NSDictionary *)notifInfo {
  if (!notificationsQueue)
    return;
  [notificationsQueue insertObject:notifInfo atIndex:0];
}

- (NSDictionary *)dequeueSingleNotification {
  if (!notificationsQueue || notificationsQueue.count == 0)
    return nil;

  NSDictionary *notifInfo = [notificationsQueue lastObject];
  [notificationsQueue removeLastObject];

  return notifInfo;
}

- (void)consumeNotificationsQueue:(void (^)(NSDictionary *))block {
  NSDictionary *notifInfo;

  while ((notifInfo = [self dequeueSingleNotification]) != nil) {
    block(notifInfo);
  }

  notificationsQueue = nil;
}

- (void)postAction:(NSDictionary *)action
       withCompletionKey:(NSString *)completionKey
    andCompletionHandler:(void (^)())completionHandler {
  // store completion handler
  actionCompletionHandlers[completionKey] = completionHandler;

  if (!actionsQueue)
    return;
  [actionsQueue insertObject:action atIndex:0];
}

- (NSDictionary *)dequeueSingleAction {
  if (!actionsQueue || actionsQueue.count == 0)
    return nil;

  NSDictionary *action = [actionsQueue lastObject];
  [actionsQueue removeLastObject];

  return action;
}

- (void)consumeActionsQueue:(void (^)(NSDictionary *))block {
  NSDictionary *lastActionInfo;

  while ((lastActionInfo = [self dequeueSingleAction]) != nil) {
    block(lastActionInfo);
  }

  actionsQueue = nil;
}

- (void)completeAction:(NSString *)completionKey {
  void (^completionHandler)() =
      (void (^)())[actionCompletionHandlers valueForKey:completionKey];
  if (completionHandler) {
    completionHandler();
    [actionCompletionHandlers removeObjectForKey:completionKey];
  }
}

@end
