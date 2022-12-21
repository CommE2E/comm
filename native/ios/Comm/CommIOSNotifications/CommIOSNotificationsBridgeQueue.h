#import <Foundation/Foundation.h>

@interface CommIOSNotificationsBridgeQueue : NSObject

@property BOOL jsIsReady;
@property NSDictionary *openedRemoteNotification;
@property NSDictionary *openedLocalNotification;

+ (nonnull instancetype)sharedInstance;

- (void)postAction:(NSDictionary *)action
       withCompletionKey:(NSString *)completionKey
    andCompletionHandler:(void (^)())completionHandler;
- (void)postNotification:(NSDictionary *)notifInfo;

- (void)consumeActionsQueue:(void (^)(NSDictionary *))block;
- (void)consumeNotificationsQueue:(void (^)(NSDictionary *))block;

- (void)completeAction:(NSString *)completionKey;

@end
