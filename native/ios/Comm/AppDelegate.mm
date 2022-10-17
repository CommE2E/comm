#import "AppDelegate.h"

#import "Orientation.h"
#import "RNNotifications.h"
#import <React/RCTRootView.h>

#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#import <reacthermes/HermesExecutorFactory.h>

#import "CommCoreModule.h"
#import "GlobalDBSingleton.h"
#import "GlobalNetworkSingleton.h"
#import "Logger.h"
#import "MessageOperationsUtilities.h"
#import "TemporaryMessageStorage.h"
#import "ThreadOperations.h"
#import "Tools.h"

#ifdef FB_SONARKIT_ENABLED
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
static void InitializeFlipper(UIApplication *application) {
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper =
      [[SKDescriptorMapper alloc] initWithDefaults];
  [client addPlugin:[[FlipperKitLayoutPlugin alloc]
                            initWithRootNode:application
                        withDescriptorMapper:layoutDescriptorMapper]];
  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client addPlugin:[[FlipperKitNetworkPlugin alloc]
                        initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client start];
}
#endif

#import <ReactCommon/RCTTurboModuleManager.h>

#import <RNReanimated/REAInitializer.h>

NSString *const backgroundNotificationTypeKey = @"backgroundNotifType";
NSString *const setUnreadStatusKey = @"setUnreadStatus";

@interface AppDelegate () <
    RCTCxxBridgeDelegate,
    RCTTurboModuleManagerDelegate> {
}
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    willFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  [self attemptDatabaseInitialization];
  return YES;
}

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
#ifdef FB_SONARKIT_ENABLED
  InitializeFlipper(application);
#endif
  [self moveMessagesToDatabase];
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self
                                            launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                   moduleName:@"Comm"
                                            initialProperties:nil];
  if (@available(iOS 13.0, *)) {
    rootView.backgroundColor = [UIColor systemBackgroundColor];
  } else {
    rootView.backgroundColor = [UIColor whiteColor];
  }

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  [super application:application didFinishLaunchingWithOptions:launchOptions];

  // This prevents a very small flicker from occurring before expo-splash-screen
  // is able to display
  UIView *launchScreenView =
      [[UIStoryboard storyboardWithName:@"SplashScreen"
                                 bundle:nil] instantiateInitialViewController]
          .view;
  launchScreenView.frame = self.window.bounds;
  rootView.loadingView = launchScreenView;
  rootView.loadingViewFadeDelay = 0;
  rootView.loadingViewFadeDuration = 0.001;

  return YES;
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge {
  // If you'd like to export some custom RCTBridgeModules that are not Expo
  // modules, add them here!
  return @[];
}

- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  [RNNotifications
      didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application
    didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [RNNotifications didFailToRegisterForRemoteNotificationsWithError:error];
}

// Required for the notification event. You must call the completion handler
// after handling the remote notification.
- (void)application:(UIApplication *)application
    didReceiveRemoteNotification:(NSDictionary *)notification
          fetchCompletionHandler:
              (void (^)(UIBackgroundFetchResult))completionHandler {
  BOOL handled = NO;
  if (notification[@"aps"][@"content-available"] &&
      notification[backgroundNotificationTypeKey]) {
    handled = [self handleBackgroundNotification:notification
                          fetchCompletionHandler:completionHandler];
  }

  if (handled) {
    return;
  }

  [RNNotifications didReceiveRemoteNotification:notification
                         fetchCompletionHandler:completionHandler];
}

- (BOOL)handleBackgroundNotification:(NSDictionary *)notification
              fetchCompletionHandler:
                  (void (^)(UIBackgroundFetchResult))completionHandler {
  if ([notification[backgroundNotificationTypeKey] isEqualToString:@"PING"]) {
    comm::GlobalNetworkSingleton::instance.scheduleOrRun(
        [=](comm::NetworkModule &networkModule) {
          networkModule.sendPong();
          dispatch_async(dispatch_get_main_queue(), ^{
            completionHandler(UIBackgroundFetchResultNewData);
          });
        });
    return YES;
  } else if ([notification[backgroundNotificationTypeKey]
                 isEqualToString:@"CLEAR"]) {
    if (notification[setUnreadStatusKey] && notification[@"threadID"]) {
      std::string threadID =
          std::string([notification[@"threadID"] UTF8String]);
      // this callback may be called from inactive state so we need
      // to initialize the database
      [self attemptDatabaseInitialization];
      comm::GlobalDBSingleton::instance.scheduleOrRun([threadID]() mutable {
        comm::ThreadOperations::updateSQLiteUnreadStatus(threadID, false);
      });
    }
    [[UNUserNotificationCenter currentNotificationCenter]
        getDeliveredNotificationsWithCompletionHandler:^(
            NSArray<UNNotification *> *notifications) {
          for (UNNotification *notif in notifications) {
            if ([notification[@"notificationId"]
                    isEqual:notif.request.content.userInfo[@"id"]]) {
              NSArray *identifiers =
                  [NSArray arrayWithObjects:notif.request.identifier, nil];
              [[UNUserNotificationCenter currentNotificationCenter]
                  removeDeliveredNotificationsWithIdentifiers:identifiers];
            }
          }
          dispatch_async(dispatch_get_main_queue(), ^{
            completionHandler(UIBackgroundFetchResultNewData);
          });
        }];
    return YES;
  }
  return NO;
}

// Required for the localNotification event.
- (void)application:(UIApplication *)application
    didReceiveLocalNotification:(UILocalNotification *)notification {
  [RNNotifications didReceiveLocalNotification:notification];
}

- (UIInterfaceOrientationMask)application:(UIApplication *)application
    supportedInterfaceOrientationsForWindow:(UIWindow *)window {
  return [Orientation getOrientation];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
#if DEBUG
  return
      [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"
                                                     fallbackResource:nil];
#else
  return [[NSBundle mainBundle] URLForResource:@"main"
                                 withExtension:@"jsbundle"];
#endif
}

using JSExecutorFactory = facebook::react::JSExecutorFactory;
using HermesExecutorFactory = facebook::react::HermesExecutorFactory;
using Runtime = facebook::jsi::Runtime;

- (std::unique_ptr<JSExecutorFactory>)jsExecutorFactoryForBridge:
    (RCTBridge *)bridge {
  __weak __typeof(self) weakSelf = self;

  const auto commRuntimeInstaller = [weakSelf,
                                     bridge](facebook::jsi::Runtime &rt) {
    if (!bridge) {
      return;
    }
    __typeof(self) strongSelf = weakSelf;
    if (strongSelf) {
      std::shared_ptr<comm::CommCoreModule> nativeModule =
          std::make_shared<comm::CommCoreModule>(bridge.jsCallInvoker);

      rt.global().setProperty(
          rt,
          facebook::jsi::PropNameID::forAscii(rt, "CommCoreModule"),
          facebook::jsi::Object::createFromHostObject(rt, nativeModule));
    }
  };
  const auto installer =
      reanimated::REAJSIExecutorRuntimeInstaller(bridge, commRuntimeInstaller);

  return std::make_unique<HermesExecutorFactory>(
      facebook::react::RCTJSIExecutorRuntimeInstaller(installer),
      JSIExecutor::defaultTimeoutInvoker,
      makeRuntimeConfig(3072));
}

- (void)attemptDatabaseInitialization {
  std::string sqliteFilePath =
      std::string([[Tools getSQLiteFilePath] UTF8String]);
  // Previous Comm versions used app group location for SQLite
  // database, so that NotificationService was able to acces it directly.
  // Unfortunately it caused errores related to system locks. The code
  // below re-migrates SQLite from app group to app specific location
  // on devices where previous Comm version was installed.
  NSString *appGroupSQLiteFilePath = [Tools getAppGroupSQLiteFilePath];
  if ([NSFileManager.defaultManager fileExistsAtPath:appGroupSQLiteFilePath] &&
      std::rename(
          std::string([appGroupSQLiteFilePath UTF8String]).c_str(),
          sqliteFilePath.c_str())) {
    throw std::runtime_error(
        "Failed to move SQLite database from app group to default location");
  }
  comm::SQLiteQueryExecutor::initialize(sqliteFilePath);
}

- (void)moveMessagesToDatabase {
  TemporaryMessageStorage *temporaryStorage =
      [[TemporaryMessageStorage alloc] init];
  NSArray<NSString *> *messages = [temporaryStorage readAndClearMessages];
  for (NSString *message in messages) {
    std::string messageInfos = std::string([message UTF8String]);
    comm::GlobalDBSingleton::instance.scheduleOrRun([messageInfos]() mutable {
      comm::MessageOperationsUtilities::storeMessageInfos(messageInfos);
    });
  }
}

// Copied from
// ReactAndroid/src/main/java/com/facebook/hermes/reactexecutor/OnLoad.cpp
static ::hermes::vm::RuntimeConfig
makeRuntimeConfig(::hermes::vm::gcheapsize_t heapSizeMB) {
  namespace vm = ::hermes::vm;
  auto gcConfigBuilder =
      vm::GCConfig::Builder()
          .withName("RN")
          // For the next two arguments: avoid GC before TTI by initializing the
          // runtime to allocate directly in the old generation, but revert to
          // normal operation when we reach the (first) TTI point.
          .withAllocInYoung(false)
          .withRevertToYGAtTTI(true);

  if (heapSizeMB > 0) {
    gcConfigBuilder.withMaxHeapSize(heapSizeMB << 20);
  }

  return vm::RuntimeConfig::Builder()
      .withGCConfig(gcConfigBuilder.build())
      .build();
}

@end
