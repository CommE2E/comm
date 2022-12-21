#import "CommIOSNotifications.h"
#import "CommIOSNotificationsBridgeQueue.h"
#import <PushKit/PushKit.h>
#import <React/RCTBridge.h>
#import <React/RCTConvert.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>
#import <UserNotifications/UserNotifications.h>

/*
 Internal Constants
*/
NSString *const CommIOSNotificationCreateAction = @"CREATE";
NSString *const CommIOSNotificationClearAction = @"CLEAR";
NSString *const CommIOSNotificationsRegistered =
    @"CommIOSNotificationsRegistered";
NSString *const CommIOSNotificationsRegistrationFailed =
    @"CommIOSNotificationsRegistrationFailed";
NSString *const CommIOSPushKitRegistered = @"CommIOSPushKitRegistered";
NSString *const CommIOSNotificationReceivedForeground =
    @"CommIOSNotificationReceivedForeground";
NSString *const CommIOSNotificationReceivedBackground =
    @"CommIOSNotificationReceivedBackground";
NSString *const CommIOSNotificationOpened = @"CommIOSNotificationOpened";
NSString *const CommIOSNotificationActionTriggered =
    @"CommIOSNotificationActionTriggered";

/*
 Constants exported to JavaScript
*/
NSString *const DEVICE_REMOTE_NOTIFICATIONS_REGISTERED_EVENT =
    @"remoteNotificationsRegistered";
NSString *const DEVICE_REMOTE_NOTIFICATIONS_REGISTRATION_FAILED_EVENT =
    @"remoteNotificationsRegistrationFailed";
NSString *const DEVICE_PUSH_KIT_REGISTERED_EVENT = @"pushKitRegistered";
NSString *const DEVICE_NOTIFICATION_RECEIVED_FOREGROUND_EVENT =
    @"notificationReceivedForeground";
NSString *const DEVICE_NOTIFICATION_RECEIVED_BACKGROUND_EVENT =
    @"notificationReceivedBackground";
NSString *const DEVICE_NOTIFICATION_OPENED_EVENT = @"notificationOpened";
NSString *const DEVICE_NOTIFICATION_ACTION_RECEIVED =
    @"notificationActionReceived";

static NSDictionary *RCTFormatUNNotification(UNNotification *notification) {
  NSMutableDictionary *formattedNotification = [NSMutableDictionary dictionary];
  UNNotificationContent *content = notification.request.content;

  formattedNotification[@"identifier"] = notification.request.identifier;

  if (notification.date) {
    NSDateFormatter *formatter = [NSDateFormatter new];
    [formatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"];
    NSString *dateString = [formatter stringFromDate:notification.date];
    formattedNotification[@"fireDate"] = dateString;
  }

  formattedNotification[@"alertTitle"] = RCTNullIfNil(content.title);
  formattedNotification[@"alertBody"] = RCTNullIfNil(content.body);
  formattedNotification[@"category"] = RCTNullIfNil(content.categoryIdentifier);
  formattedNotification[@"thread-id"] = RCTNullIfNil(content.threadIdentifier);
  formattedNotification[@"userInfo"] =
      RCTNullIfNil(RCTJSONClean(content.userInfo));

  return formattedNotification;
}

@interface CommIOSNotifications ()
@property(nonatomic, strong) NSMutableDictionary *remoteNotificationCallbacks;
@end

@implementation CommIOSNotifications

RCT_EXPORT_MODULE()

@synthesize bridge = _bridge;

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)setBridge:(RCTBridge *)bridge {
  _bridge = bridge;

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(handleNotificationsRegistered:)
             name:CommIOSNotificationsRegistered
           object:nil];

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(handleNotificationsRegistrationFailed:)
             name:CommIOSNotificationsRegistrationFailed
           object:nil];

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(handlePushKitRegistered:)
             name:CommIOSPushKitRegistered
           object:nil];

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(handleNotificationReceivedForeground:)
             name:CommIOSNotificationReceivedForeground
           object:nil];

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(handleNotificationReceivedBackground:)
             name:CommIOSNotificationReceivedBackground
           object:nil];

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(handleNotificationOpened:)
             name:CommIOSNotificationOpened
           object:nil];

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(handleNotificationActionTriggered:)
             name:CommIOSNotificationActionTriggered
           object:nil];

  [CommIOSNotificationsBridgeQueue sharedInstance].openedRemoteNotification =
      [_bridge.launchOptions
          objectForKey:UIApplicationLaunchOptionsRemoteNotificationKey];
  UILocalNotification *localNotification = [_bridge.launchOptions
      objectForKey:UIApplicationLaunchOptionsLocalNotificationKey];
  [CommIOSNotificationsBridgeQueue sharedInstance].openedLocalNotification =
      localNotification ? localNotification.userInfo : nil;
}

/*
 Exporting constants to JavaScript
*/
- (NSDictionary *)constantsToExport {
  return @{
    @"DEVICE_REMOTE_NOTIFICATIONS_REGISTERED_EVENT" :
        DEVICE_REMOTE_NOTIFICATIONS_REGISTERED_EVENT,
    @"DEVICE_REMOTE_NOTIFICATIONS_REGISTRATION_FAILED_EVENT" :
        DEVICE_REMOTE_NOTIFICATIONS_REGISTRATION_FAILED_EVENT,
    @"DEVICE_PUSH_KIT_REGISTERED_EVENT" : DEVICE_PUSH_KIT_REGISTERED_EVENT,
    @"DEVICE_NOTIFICATION_RECEIVED_FOREGROUND_EVENT" :
        DEVICE_NOTIFICATION_RECEIVED_FOREGROUND_EVENT,
    @"DEVICE_NOTIFICATION_RECEIVED_BACKGROUND_EVENT" :
        DEVICE_NOTIFICATION_RECEIVED_BACKGROUND_EVENT,
    @"DEVICE_NOTIFICATION_OPENED_EVENT" : DEVICE_NOTIFICATION_OPENED_EVENT,
    @"DEVICE_NOTIFICATION_ACTION_RECEIVED" :
        DEVICE_NOTIFICATION_ACTION_RECEIVED,
  };
}

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

/*
 Public methods
*/
+ (void)didRegisterForRemoteNotificationsWithDeviceToken:(id)deviceToken {
  NSString *tokenRepresentation = [deviceToken isKindOfClass:[NSString class]]
      ? deviceToken
      : [self deviceTokenToString:deviceToken];
  [[NSNotificationCenter defaultCenter]
      postNotificationName:CommIOSNotificationsRegistered
                    object:self
                  userInfo:@{@"deviceToken" : tokenRepresentation}];
}

+ (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [[NSNotificationCenter defaultCenter]
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

  if ([CommIOSNotificationsBridgeQueue sharedInstance].jsIsReady == YES) {
    // JS thread is ready, push the notification to the bridge

    if (state == UIApplicationStateActive) {
      // Notification received foreground
      [self didReceiveNotificationOnForegroundState:notifInfo];
    } else if (state == UIApplicationStateInactive) {
      // Notification opened
      [self didNotificationOpen:notifInfo];
    } else {
      // Notification received background
      [self didReceiveNotificationOnBackgroundState:notifInfo];
    }
  } else {
    // JS thread is not ready - store it in the native notifications queue
    [[CommIOSNotificationsBridgeQueue sharedInstance]
        postNotification:notifInfo];
  }
}

+ (void)didReceiveLocalNotification:(UILocalNotification *)notification {
  UIApplicationState state = [UIApplication sharedApplication].applicationState;

  NSMutableDictionary *newUserInfo = notification.userInfo.mutableCopy;
  [newUserInfo removeObjectForKey:@"__id"];
  notification.userInfo = newUserInfo;

  NSDictionary *notifInfo = @{@"notification" : notification.userInfo};
  if (state == UIApplicationStateActive) {
    [self didReceiveNotificationOnForegroundState:notifInfo];
  } else if (state == UIApplicationStateInactive) {
    NSString *notificationId =
        [notification.userInfo objectForKey:@"notificationId"];
    if (notificationId) {
      [self clearNotificationFromNotificationsCenter:notificationId
                                   completionHandler:nil];
    }
    [self didNotificationOpen:notifInfo];
  }
}

/*
 JavaScript Events
*/
- (void)handleNotificationsRegistered:(NSNotification *)notification {
  [_bridge.eventDispatcher
      sendDeviceEventWithName:@"remoteNotificationsRegistered"
                         body:notification.userInfo];
}

- (void)handleNotificationsRegistrationFailed:(NSNotification *)notification {
  [_bridge.eventDispatcher
      sendDeviceEventWithName:@"remoteNotificationsRegistrationFailed"
                         body:notification.userInfo];
}

- (void)handlePushKitRegistered:(NSNotification *)notification {
  [_bridge.eventDispatcher sendDeviceEventWithName:@"pushKitRegistered"
                                              body:notification.userInfo];
}

- (void)handleNotifInfo:(NSDictionary *)notifInfo withName:(NSString *)name {
  NSDictionary *notification = notifInfo[@"notification"];
  NSString *notifID = notification[@"id"];
  RCTRemoteNotificationCallback completionHandler =
      notifInfo[@"completionHandler"];
  if (completionHandler && notifID) {
    if (!self.remoteNotificationCallbacks) {
      // Lazy initialization
      self.remoteNotificationCallbacks = [NSMutableDictionary dictionary];
    }
    self.remoteNotificationCallbacks[notifID] = completionHandler;
  }
  [_bridge.eventDispatcher sendDeviceEventWithName:name body:notification];
}

- (void)handleNotificationReceivedForeground:(NSNotification *)sysNotif {
  [self handleNotifInfo:sysNotif.userInfo
               withName:@"notificationReceivedForeground"];
}

- (void)handleNotificationReceivedBackground:(NSNotification *)sysNotif {
  [self handleNotifInfo:sysNotif.userInfo
               withName:@"notificationReceivedBackground"];
}

- (void)handleNotificationOpened:(NSNotification *)sysNotif {
  [self handleNotifInfo:sysNotif.userInfo withName:@"notificationOpened"];
}

- (void)handleNotificationActionTriggered:(NSNotification *)notification {
  [_bridge.eventDispatcher sendAppEventWithName:@"notificationActionReceived"
                                           body:notification.userInfo];
}

/*
 Notifications Handlers
*/
+ (void)didReceiveNotificationOnForegroundState:(NSDictionary *)notifInfo {
  [[NSNotificationCenter defaultCenter]
      postNotificationName:CommIOSNotificationReceivedForeground
                    object:self
                  userInfo:notifInfo];
}

+ (void)didReceiveNotificationOnBackgroundState:(NSDictionary *)notifInfo {
  NSDictionary *notification = notifInfo[@"notification"];

  NSDictionary *managedAps = [notification objectForKey:@"managedAps"];
  NSDictionary *alert = [managedAps objectForKey:@"alert"];
  NSString *action = [managedAps objectForKey:@"action"];
  NSString *notificationId = [managedAps objectForKey:@"notificationId"];

  if (action) {
    // create or delete notification
    if ([action isEqualToString:CommIOSNotificationCreateAction] &&
        notificationId && alert) {
      [self dispatchLocalNotificationFromNotification:notification];

    } else if (
        [action isEqualToString:CommIOSNotificationClearAction] &&
        notificationId) {
      [self clearNotificationFromNotificationsCenter:notificationId
                                   completionHandler:
                                       notifInfo[@"completionHandler"]];
    }
  }

  [[NSNotificationCenter defaultCenter]
      postNotificationName:CommIOSNotificationReceivedBackground
                    object:self
                  userInfo:notifInfo];
}

+ (void)didNotificationOpen:(NSDictionary *)notifInfo {
  [[NSNotificationCenter defaultCenter]
      postNotificationName:CommIOSNotificationOpened
                    object:self
                  userInfo:notifInfo];
}

/*
 Helper methods
*/
+ (void)dispatchLocalNotificationFromNotification:(NSDictionary *)notification {
  NSDictionary *managedAps = [notification objectForKey:@"managedAps"];
  NSDictionary *alert = [managedAps objectForKey:@"alert"];
  NSString *action = [managedAps objectForKey:@"action"];
  NSString *notificationId = [managedAps objectForKey:@"notificationId"];

  if ([action isEqualToString:CommIOSNotificationCreateAction] &&
      notificationId && alert) {

    // trigger new client push notification
    UILocalNotification *note = [UILocalNotification new];
    note.alertTitle = [alert objectForKey:@"title"];
    note.alertBody = [alert objectForKey:@"body"];
    note.userInfo = notification;
    note.soundName = [managedAps objectForKey:@"sound"];
    note.category = [managedAps objectForKey:@"category"];

    [[UIApplication sharedApplication] presentLocalNotificationNow:note];

    // Serialize it and store so we can delete it later
    NSData *data = [NSKeyedArchiver archivedDataWithRootObject:note];
    NSString *notificationKey =
        [self buildNotificationKeyfromNotification:notificationId];
    [[NSUserDefaults standardUserDefaults] setObject:data
                                              forKey:notificationKey];
    [[NSUserDefaults standardUserDefaults] synchronize];

    NSLog(@"Local notification was triggered: %@", notificationKey);
  }
}

+ (void)clearNotificationFromNotificationsCenter:(NSString *)notificationId
                               completionHandler:(void (^)())completionHandler {
  if ([UNUserNotificationCenter class]) {
    if (completionHandler) {
      completionHandler();
    }
    [[UNUserNotificationCenter currentNotificationCenter]
        getDeliveredNotificationsWithCompletionHandler:^(
            NSArray<UNNotification *> *_Nonnull notifications) {
          for (UNNotification *notif in notifications) {
            if ([notificationId
                    isEqual:notif.request.content.userInfo[@"id"]]) {
              NSArray *identifiers =
                  [NSArray arrayWithObjects:notif.request.identifier, nil];
              [[UNUserNotificationCenter currentNotificationCenter]
                  removeDeliveredNotificationsWithIdentifiers:identifiers];
            }
          }
        }];
    return;
  }

  NSString *notificationKey =
      [self buildNotificationKeyfromNotification:notificationId];
  NSData *data =
      [[NSUserDefaults standardUserDefaults] objectForKey:notificationKey];
  if (data) {
    UILocalNotification *notification =
        [NSKeyedUnarchiver unarchiveObjectWithData:data];

    // delete the notification
    [[UIApplication sharedApplication] cancelLocalNotification:notification];
    [[NSUserDefaults standardUserDefaults] removeObjectForKey:notificationKey];

    NSLog(@"Local notification removed: %@", notificationKey);

    return;
  }
}

+ (NSString *)buildNotificationKeyfromNotification:(NSString *)notificationId {
  return [NSString stringWithFormat:@"%@.%@",
                                    [[NSBundle mainBundle] bundleIdentifier],
                                    notificationId];
}

+ (NSString *)deviceTokenToString:(NSData *)deviceToken {
  NSMutableString *result = [NSMutableString string];
  NSUInteger deviceTokenLength = deviceToken.length;
  const unsigned char *bytes = (const unsigned char *)deviceToken.bytes;
  for (NSUInteger i = 0; i < deviceTokenLength; i++) {
    [result appendFormat:@"%02x", bytes[i]];
  }

  return [result copy];
}

+ (void)requestPermissions {
  UNUserNotificationCenter *center =
      [UNUserNotificationCenter currentNotificationCenter];
  UNAuthorizationOptions options = UNAuthorizationOptionAlert +
      UNAuthorizationOptionSound + UNAuthorizationOptionBadge;
  [center
      requestAuthorizationWithOptions:options
                    completionHandler:^(
                        BOOL granted, NSError *_Nullable error) {
                      if (!granted) {
                        NSDictionary *errorInfo;
                        if (error) {
                          errorInfo = @{
                            @"code" : [NSNumber numberWithInteger:error.code],
                            @"domain" : error.domain,
                            @"localizedDescription" : error.localizedDescription
                          };
                        } else {
                          errorInfo = @{};
                        }
                        [[NSNotificationCenter defaultCenter]
                            postNotificationName:
                                CommIOSNotificationsRegistrationFailed
                                          object:self
                                        userInfo:errorInfo];
                        return;
                      }
                      if ([UIApplication instancesRespondToSelector:@selector
                                         (registerForRemoteNotifications)]) {
                        dispatch_async(dispatch_get_main_queue(), ^{
                          [[UIApplication sharedApplication]
                              registerForRemoteNotifications];
                        });
                      }
                    }];
}

/*
 React Native exported methods
*/
RCT_EXPORT_METHOD(requestPermissions) {
  [CommIOSNotifications requestPermissions];
}

RCT_EXPORT_METHOD(setBadgesCount : (int)count) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [[UIApplication sharedApplication] setApplicationIconBadgeNumber:count];
  });
}

RCT_EXPORT_METHOD(consumeBackgroundQueue) {
  // Mark JS Thread as ready
  [CommIOSNotificationsBridgeQueue sharedInstance].jsIsReady = YES;

  // Push actions to JS
  [[CommIOSNotificationsBridgeQueue sharedInstance]
      consumeActionsQueue:^(NSDictionary *action) {
        [[NSNotificationCenter defaultCenter]
            postNotificationName:CommIOSNotificationActionTriggered
                          object:self
                        userInfo:action];
      }];

  // Push background notifications to JS
  [[CommIOSNotificationsBridgeQueue sharedInstance]
      consumeNotificationsQueue:^(NSDictionary *notifInfo) {
        NSDictionary *notification = notifInfo[@"notification"];
        RCTRemoteNotificationCallback completionHandler =
            notifInfo[@"completionHandler"];
        [CommIOSNotifications didReceiveRemoteNotification:notification
                                    fetchCompletionHandler:completionHandler];
      }];

  // Push opened local notifications
  NSDictionary *openedLocalNotification =
      [CommIOSNotificationsBridgeQueue sharedInstance].openedLocalNotification;
  if (openedLocalNotification) {
    [CommIOSNotificationsBridgeQueue sharedInstance].openedLocalNotification =
        nil;
    NSDictionary *notifInfo = @{@"notification" : openedLocalNotification};
    [CommIOSNotifications didNotificationOpen:notifInfo];
  }

  // Push opened remote notifications
  NSDictionary *openedRemoteNotification =
      [CommIOSNotificationsBridgeQueue sharedInstance].openedRemoteNotification;
  if (openedRemoteNotification) {
    [CommIOSNotificationsBridgeQueue sharedInstance].openedRemoteNotification =
        nil;
    NSDictionary *notifInfo = @{@"notification" : openedRemoteNotification};
    [CommIOSNotifications didNotificationOpen:notifInfo];
  }
}

RCT_EXPORT_METHOD(checkPermissions
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject) {
  UIUserNotificationSettings *currentSettings =
      [[UIApplication sharedApplication] currentUserNotificationSettings];
  resolve(@{
    @"badge" : @((currentSettings.types & UIUserNotificationTypeBadge) > 0),
    @"sound" : @((currentSettings.types & UIUserNotificationTypeSound) > 0),
    @"alert" : @((currentSettings.types & UIUserNotificationTypeAlert) > 0),
  });
}

RCT_EXPORT_METHOD(removeAllDeliveredNotifications) {
  if ([UNUserNotificationCenter class]) {
    UNUserNotificationCenter *center =
        [UNUserNotificationCenter currentNotificationCenter];
    [center removeAllDeliveredNotifications];
  }
}

RCT_EXPORT_METHOD(removeDeliveredNotifications
                  : (NSArray<NSString *> *)identifiers) {
  if ([UNUserNotificationCenter class]) {
    UNUserNotificationCenter *center =
        [UNUserNotificationCenter currentNotificationCenter];
    [center removeDeliveredNotificationsWithIdentifiers:identifiers];
  }
}

RCT_EXPORT_METHOD(getDeliveredNotifications
                  : (RCTResponseSenderBlock)callback) {
  if ([UNUserNotificationCenter class]) {
    UNUserNotificationCenter *center =
        [UNUserNotificationCenter currentNotificationCenter];
    [center getDeliveredNotificationsWithCompletionHandler:^(
                NSArray<UNNotification *> *_Nonnull notifications) {
      NSMutableArray<NSDictionary *> *formattedNotifications =
          [NSMutableArray new];

      for (UNNotification *notification in notifications) {
        [formattedNotifications
            addObject:RCTFormatUNNotification(notification)];
      }
      callback(@[ formattedNotifications ]);
    }];
  }
}

@end
