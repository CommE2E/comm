#import "CommIOSNotifications.h"
#import "CommIOSNotificationsBridgeQueue.h"
#import "Logger.h"
#import <React/RCTBridge.h>
#import <React/RCTConvert.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>
#import <UserNotifications/UserNotifications.h>

/*
 Internal Constants
*/
NSString *const CommIOSNotificationsRegistered =
    @"CommIOSNotificationsRegistered";
NSString *const CommIOSNotificationsRegistrationFailed =
    @"CommIOSNotificationsRegistrationFailed";
NSString *const CommIOSNotificationsReceivedForeground =
    @"CommIOSNotificationsReceivedForeground";
NSString *const CommIOSNotificationsOpened = @"CommIOSNotificationsOpened";
NSString *const CommIOSNotificationsReceivedBackground =
    @"CommIOSNotificationsReceivedBackground";

/*
 UIBackgroundFetchResult enum converter to pass fetch result value
 between Objective - C and JavaScript
*/
@implementation RCTConvert (UIBackgroundFetchResult)

RCT_ENUM_CONVERTER(
    UIBackgroundFetchResult,
    (@{
      @"UIBackgroundFetchResultNewData" : @(UIBackgroundFetchResultNewData),
      @"UIBackgroundFetchResultNoData" : @(UIBackgroundFetchResultNoData),
      @"UIBackgroundFetchResultFailed" : @(UIBackgroundFetchResultFailed),
    }),
    UIBackgroundFetchResultNoData,
    integerValue)

@end

@implementation CommIOSNotifications

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

- (void)setBridge:(RCTBridge *)bridge {
  _bridge = bridge;
  [CommIOSNotificationsBridgeQueue sharedInstance].openedRemoteNotification =
      [_bridge.launchOptions
          objectForKey:UIApplicationLaunchOptionsRemoteNotificationKey];
}

- (void)stopObserving {
  _hasListeners = NO;
}

- (void)startObserving {
  _hasListeners = YES;
}

- (instancetype)init {
  self = [super init];
  if (!self) {
    return self;
  }
  _hasListeners = NO;
  _remoteNotificationCallbacks = [NSMutableDictionary dictionary];
  [NSNotificationCenter.defaultCenter
      addObserver:self
         selector:@selector(handleNotificationsRegistered:)
             name:CommIOSNotificationsRegistered
           object:nil];

  [NSNotificationCenter.defaultCenter
      addObserver:self
         selector:@selector(handleNotificationsRegistrationFailed:)
             name:CommIOSNotificationsRegistrationFailed
           object:nil];

  [NSNotificationCenter.defaultCenter
      addObserver:self
         selector:@selector(handleNotificationReceivedForeground:)
             name:CommIOSNotificationsReceivedForeground
           object:nil];

  [NSNotificationCenter.defaultCenter
      addObserver:self
         selector:@selector(handleNotificationOpened:)
             name:CommIOSNotificationsOpened
           object:nil];
  [NSNotificationCenter.defaultCenter
      addObserver:self
         selector:@selector(handleNotificationReceivedBackground:)
             name:CommIOSNotificationsReceivedBackground
           object:nil];
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (NSArray<NSString *> *)supportedEvents {
  return @[
    @"remoteNotificationsRegistered",
    @"remoteNotificationsRegistrationFailed",
    @"notificationReceivedForeground",
    @"notificationOpened",
    @"notificationReceivedBackground",
  ];
}

/*
 Constants used un JavaScript
*/
- (NSDictionary *)constantsToExport {
  return @{
    @"FETCH_RESULT_NEW_DATA" : @"UIBackgroundFetchResultNewData",
    @"FETCH_RESULT_NO_DATA" : @"UIBackgroundFetchResultNoData",
    @"FETCH_RESULT_FAILED" : @"UIBackgroundFetchResultFailed"
  };
}

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

/*
 Public methods
*/
+ (void)didRegisterForRemoteNotificationsWithDeviceToken:(id)deviceToken {
  NSString *token = [deviceToken isKindOfClass:[NSString class]]
      ? deviceToken
      : [self deviceTokenToString:deviceToken];
  [NSNotificationCenter.defaultCenter
      postNotificationName:CommIOSNotificationsRegistered
                    object:self
                  userInfo:@{@"deviceToken" : token}];
}

+ (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [NSNotificationCenter.defaultCenter
      postNotificationName:CommIOSNotificationsRegistrationFailed
                    object:self
                  userInfo:@{
                    @"code" : [NSNumber numberWithInteger:error.code],
                    @"domain" : error.domain,
                    @"localizedDescription" : error.localizedDescription
                  }];
}

+ (void)didReceiveRemoteNotification:(NSDictionary *)notification
              fetchCompletionHandler:
                  (void (^)(UIBackgroundFetchResult))completionHandler {

  NSDictionary *notifInfo = @{
    @"notification" : notification,
    @"completionHandler" : completionHandler
  };
  UIApplicationState state = [UIApplication sharedApplication].applicationState;

  if (!CommIOSNotificationsBridgeQueue.sharedInstance.jsReady) {
    [CommIOSNotificationsBridgeQueue.sharedInstance putNotification:notifInfo];
    return;
  }

  if (state == UIApplicationStateActive) {
    [NSNotificationCenter.defaultCenter
        postNotificationName:CommIOSNotificationsReceivedForeground
                      object:self
                    userInfo:notifInfo];
  } else if (state == UIApplicationStateInactive) {
    [NSNotificationCenter.defaultCenter
        postNotificationName:CommIOSNotificationsOpened
                      object:self
                    userInfo:notifInfo];
  }
}

+ (void)didReceiveBackgroundMessageInfos:(NSDictionary *)notification {
  [NSNotificationCenter.defaultCenter
      postNotificationName:CommIOSNotificationsReceivedBackground
                    object:self
                  userInfo:notification];
}

+ (void)clearNotificationFromNotificationsCenter:(NSString *)notificationId
                               completionHandler:
                                   (void (^)(UIBackgroundFetchResult))
                                       completionHandler {
  [UNUserNotificationCenter.currentNotificationCenter
      getDeliveredNotificationsWithCompletionHandler:^(
          NSArray<UNNotification *> *_Nonnull notifications) {
        for (UNNotification *notif in notifications) {
          if ([notificationId isEqual:notif.request.content.userInfo[@"id"]]) {
            NSArray *identifiers =
                [NSArray arrayWithObjects:notif.request.identifier, nil];
            [UNUserNotificationCenter.currentNotificationCenter
                removeDeliveredNotificationsWithIdentifiers:identifiers];
          }
        }
        if (completionHandler) {
          dispatch_async(dispatch_get_main_queue(), ^{
            completionHandler(UIBackgroundFetchResultNewData);
          });
        }
      }];
  return;
}

/*
 JavaScript Events
 */
- (void)handleNotificationsRegistered:(NSNotification *)notification {
  if (!_hasListeners) {
    return;
  }
  [self sendEventWithName:@"remoteNotificationsRegistered"
                     body:notification.userInfo];
}

- (void)handleNotificationsRegistrationFailed:(NSNotification *)notification {
  if (!_hasListeners) {
    return;
  }
  [self sendEventWithName:@"remoteNotificationsRegistrationFailed"
                     body:notification.userInfo];
}

- (void)handleNotifInfo:(NSDictionary *)notifInfo withName:(NSString *)name {
  NSDictionary *notification = notifInfo[@"notification"];
  NSString *notifID = notification[@"id"];

  RCTRemoteNotificationCallback completionHandler =
      notifInfo[@"completionHandler"];
  if (completionHandler && notifID) {
    self.remoteNotificationCallbacks[notifID] = completionHandler;
  }

  NSDictionary *jsReadableNotification =
      [CommIOSNotifications parseNotificationToJSReadableObject:notification
                                          withRequestIdentifier:nil];
  if (!jsReadableNotification) {
    return;
  }

  [self sendEventWithName:name body:jsReadableNotification];
}

- (void)handleNotificationReceivedForeground:(NSNotification *)sysNotif {
  if (!_hasListeners) {
    return;
  }
  [self handleNotifInfo:sysNotif.userInfo
               withName:@"notificationReceivedForeground"];
}

- (void)handleNotificationOpened:(NSNotification *)sysNotif {
  if (!_hasListeners) {
    return;
  }
  [self handleNotifInfo:sysNotif.userInfo withName:@"notificationOpened"];
}

- (void)handleNotificationReceivedBackground:(NSNotification *)sysNotif {
  if (!_hasListeners) {
    return;
  }
  [self sendEventWithName:@"notificationReceivedBackground"
                     body:sysNotif.userInfo];
}

/*
 Helper methods
*/
+ (NSString *)deviceTokenToString:(NSData *)deviceToken {
  NSMutableString *result = [NSMutableString string];
  const unsigned char *bytes = (const unsigned char *)deviceToken.bytes;
  for (NSUInteger i = 0; i < deviceToken.length; i++) {
    [result appendFormat:@"%02x", bytes[i]];
  }
  return [result copy];
}

+ (NSDictionary *)parseNotificationToJSReadableObject:
                      (NSDictionary *)notification
                                withRequestIdentifier:(NSString *)identifier {
  NSMutableDictionary *jsReadableNotification =
      [[NSMutableDictionary alloc] init];

  static NSArray<NSString *> *obligatoryJSNotificationKeys =
      @[ @"id", @"threadID" ];
  static NSArray<NSString *> *optionalJSNotificationKeys =
      @[ @"body", @"title", @"messageInfos", @"prefix" ];

  for (NSString *key in obligatoryJSNotificationKeys) {
    if (!notification[key]) {
      comm::Logger::log(
          "Received malformed notification missing key: " +
          std::string([key UTF8String]));
      return nil;
    }
    jsReadableNotification[key] = notification[key];
  }

  for (NSString *key in optionalJSNotificationKeys) {
    if (notification[key]) {
      jsReadableNotification[key] = notification[key];
    }
  }

  if (notification[@"aps"] && notification[@"aps"][@"alert"]) {
    jsReadableNotification[@"message"] = notification[@"aps"][@"alert"];
  }

  if (identifier) {
    jsReadableNotification[@"identifier"] = identifier;
  }

  return jsReadableNotification;
}

/*
 React Native exported methods
*/
RCT_EXPORT_METHOD(requestPermissions) {
  UNAuthorizationOptions options = UNAuthorizationOptionAlert +
      UNAuthorizationOptionSound + UNAuthorizationOptionBadge;
  void (^authorizationRequestCompletionHandler)(BOOL, NSError *) =
      ^(BOOL granted, NSError *_Nullable error) {
        if (granted &&
            [UIApplication instancesRespondToSelector:@selector
                           (registerForRemoteNotifications)]) {
          dispatch_async(dispatch_get_main_queue(), ^{
            [[UIApplication sharedApplication] registerForRemoteNotifications];
          });
          return;
        }

        NSDictionary *errorInfo = @{};
        if (error) {
          errorInfo = @{
            @"code" : [NSNumber numberWithInteger:error.code],
            @"domain" : error.domain,
            @"localizedDescription" : error.localizedDescription
          };
        }

        [NSNotificationCenter.defaultCenter
            postNotificationName:CommIOSNotificationsRegistrationFailed
                          object:self
                        userInfo:errorInfo];
      };
  [UNUserNotificationCenter.currentNotificationCenter
      requestAuthorizationWithOptions:options
                    completionHandler:authorizationRequestCompletionHandler];
}

RCT_EXPORT_METHOD(completeNotif
                  : (NSString *)completionKey fetchResult
                  : (UIBackgroundFetchResult)result) {
  RCTRemoteNotificationCallback completionHandler =
      self.remoteNotificationCallbacks[completionKey];
  if (!completionHandler) {
    NSLog(@"There is no completion handler with key: %@", completionKey);
    return;
  }
  completionHandler(result);
  [self.remoteNotificationCallbacks removeObjectForKey:completionKey];
}

RCT_EXPORT_METHOD(setBadgesCount : (int)count) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [[UIApplication sharedApplication] setApplicationIconBadgeNumber:count];
  });
}

RCT_EXPORT_METHOD(consumeBackgroundQueue) {
  CommIOSNotificationsBridgeQueue.sharedInstance.jsReady = YES;

  // Push background notifications to JS
  [CommIOSNotificationsBridgeQueue.sharedInstance
      processNotifications:^(NSDictionary *notifInfo) {
        NSDictionary *notification = notifInfo[@"notification"];
        RCTRemoteNotificationCallback completionHandler =
            notifInfo[@"completionHandler"];
        [CommIOSNotifications didReceiveRemoteNotification:notification
                                    fetchCompletionHandler:completionHandler];
      }];

  // Push opened remote notifications
  NSDictionary *openedRemoteNotification =
      CommIOSNotificationsBridgeQueue.sharedInstance.openedRemoteNotification;
  if (openedRemoteNotification) {
    CommIOSNotificationsBridgeQueue.sharedInstance.openedRemoteNotification =
        nil;
    NSDictionary *notifInfo = @{@"notification" : openedRemoteNotification};
    [NSNotificationCenter.defaultCenter
        postNotificationName:CommIOSNotificationsOpened
                      object:self
                    userInfo:notifInfo];
  }
}

RCT_EXPORT_METHOD(checkPermissions
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject) {
  __block NSDictionary *permissions;
  [UNUserNotificationCenter.currentNotificationCenter
      getNotificationSettingsWithCompletionHandler:^(
          UNNotificationSettings *_Nonnull settings) {
        permissions = @{
          @"badge" : @(settings.badgeSetting == UNNotificationSettingEnabled),
          @"sound" : @(settings.soundSetting == UNNotificationSettingEnabled),
          @"alert" : @(settings.alertSetting == UNNotificationSettingEnabled)
        };
        resolve(permissions);
      }];
}

RCT_EXPORT_METHOD(removeAllDeliveredNotifications) {
  [UNUserNotificationCenter
          .currentNotificationCenter removeAllDeliveredNotifications];
}

RCT_EXPORT_METHOD(removeDeliveredNotifications
                  : (NSArray<NSString *> *)identifiers) {
  [UNUserNotificationCenter.currentNotificationCenter
      removeDeliveredNotificationsWithIdentifiers:identifiers];
}
RCT_EXPORT_METHOD(getDeliveredNotifications
                  : (RCTResponseSenderBlock)callback) {
  [UNUserNotificationCenter.currentNotificationCenter
      getDeliveredNotificationsWithCompletionHandler:^(
          NSArray<UNNotification *> *_Nonnull notifications) {
        NSMutableArray<NSDictionary *> *formattedNotifications =
            [NSMutableArray new];

        for (UNNotification *notification in notifications) {
          NSDictionary *jsReadableNotification = [CommIOSNotifications
              parseNotificationToJSReadableObject:notification.request.content
                                                      .userInfo
                            withRequestIdentifier:notification.request
                                                      .identifier];
          if (!jsReadableNotification) {
            continue;
          }
          [formattedNotifications addObject:jsReadableNotification];
        }
        callback(@[ formattedNotifications ]);
      }];
}

@end
