#import "CommIOSNotifications.h"
#import "CommIOSNotificationsBridgeQueue.h"
#import "Logger.h"
#import <React/RCTBridge.h>
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
    @"notificationOpened"
  ];
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

/*
 Helper methods
*/
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

@end
