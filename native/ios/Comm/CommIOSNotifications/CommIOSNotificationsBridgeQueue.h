#import <Foundation/Foundation.h>

@interface CommIOSNotificationsBridgeQueue : NSObject

@property BOOL jsReady;

+ (nonnull instancetype)sharedInstance;

- (void)putNotification:(NSDictionary *)notifInfo
               withName:(NSNotificationName)name;
- (void)processNotifications:
    (void (^)(NSDictionary *, NSNotificationName))block;

@end
