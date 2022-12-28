#import <Foundation/Foundation.h>

@interface CommIOSNotificationsBridgeQueue : NSObject

@property BOOL jsReady;
@property NSDictionary *openedRemoteNotification;

+ (nonnull instancetype)sharedInstance;

- (void)putNotification:(NSDictionary *)notifInfo;
- (void)processNotifications:(void (^)(NSDictionary *))block;

@end
