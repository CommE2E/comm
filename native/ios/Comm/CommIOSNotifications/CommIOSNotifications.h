@import UIKit;

#import <PushKit/PushKit.h>
#import <React/RCTBridgeModule.h>

@interface CommIOSNotifications : NSObject <RCTBridgeModule>

typedef void (^RCTRemoteNotificationCallback)(UIBackgroundFetchResult result);

+ (void)didRegisterForRemoteNotificationsWithDeviceToken:(id)deviceToken;
+ (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error;
+ (void)didReceiveRemoteNotification:(NSDictionary *)notification
              fetchCompletionHandler:
                  (void (^)(UIBackgroundFetchResult))completionHandler;
+ (void)didReceiveLocalNotification:(UILocalNotification *)notification;

@end
