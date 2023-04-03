@import UIKit;

#import <PushKit/PushKit.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface CommIOSNotifications : RCTEventEmitter <RCTBridgeModule>
@property(nonatomic, strong) NSMutableDictionary *remoteNotificationCallbacks;
@property(nonatomic) BOOL hasListeners;

typedef void (^RCTRemoteNotificationCallback)(UIBackgroundFetchResult result);

+ (void)didRegisterForRemoteNotificationsWithDeviceToken:(id)deviceToken;
+ (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error;
+ (void)didReceiveRemoteNotification:(NSDictionary *)notification
              fetchCompletionHandler:
                  (void (^)(UIBackgroundFetchResult))completionHandler;
+ (void)didReceiveBackgroundMessageInfos:(NSDictionary *)notification;
+ (void)clearNotificationFromNotificationsCenter:(NSString *)notificationId
                               completionHandler:
                                   (void (^)(UIBackgroundFetchResult))
                                       completionHandler;

@end
