#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

#import <React/RCTAppSetupUtils.h>

#if RCT_NEW_ARCH_ENABLED
#import <React/CoreModulesPlugins.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTFabricSurfaceHostingProxyRootView.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <ReactCommon/RCTTurboModuleManager.h>
#import <react/config/ReactNativeConfig.h>
static NSString *const kRNConcurrentRoot = @"concurrentRoot";
@interface AppDelegate () <
    RCTCxxBridgeDelegate,
    RCTTurboModuleManagerDelegate> {
  RCTTurboModuleManager *_turboModuleManager;
  RCTSurfacePresenterBridgeAdapter *_bridgeAdapter;
  std::shared_ptr<const facebook::react::ReactNativeConfig> _reactNativeConfig;
  facebook::react::ContextContainer::Shared _contextContainer;
}
@end
#endif

#import "CommIOSNotifications.h"
#import "Orientation.h"
#import <React/RCTConvert.h>

#import <React/RCTBridge+Private.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#import <React/RCTLinkingManager.h>
#import <cxxreact/JSExecutor.h>
#import <jsireact/JSIExecutor.h>
#import <reacthermes/HermesExecutorFactory.h>

#import "CommConstants.h"
#import "CommCoreModule.h"
#import "CommRustModule.h"
#import "CommUtilsModule.h"
#import "GlobalDBSingleton.h"
#import "Logger.h"
#import "MessageOperationsUtilities.h"
#import "TemporaryMessageStorage.h"
#import "ThreadOperations.h"
#import "Tools.h"
#import <cstdio>
#import <stdexcept>
#import <string>

#import <ReactCommon/RCTTurboModuleManager.h>

#import <RNReanimated/REAInitializer.h>

#import <UserNotifications/UserNotifications.h>

NSString *const setUnreadStatusKey = @"setUnreadStatus";
NSString *const threadIDKey = @"threadID";
NSString *const newMessageInfosNSNotification =
    @"app.comm.ns_new_message_infos";
CFStringRef newMessageInfosDarwinNotification =
    CFSTR("app.comm.darwin_new_message_infos");

void didReceiveNewMessageInfosDarwinNotification(
    CFNotificationCenterRef center,
    void *observer,
    CFStringRef name,
    const void *object,
    CFDictionaryRef userInfo) {
  [[NSNotificationCenter defaultCenter]
      postNotificationName:newMessageInfosNSNotification
                    object:nil];
}

@interface AppDelegate () <
    RCTCxxBridgeDelegate,
    RCTTurboModuleManagerDelegate> {
}
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    willFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  [self attemptDatabaseInitialization];
  [self registerForNewMessageInfosNotifications];
  return YES;
}

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  RCTAppSetupPrepareApp(application);

  [self moveMessagesToDatabase:NO];
  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryAmbient
                                         error:nil];

  RCTBridge *bridge =
      [self.reactDelegate createBridgeWithDelegate:self
                                     launchOptions:launchOptions];

#if RCT_NEW_ARCH_ENABLED
  _contextContainer =
      std::make_shared<facebook::react::ContextContainer const>();
  _reactNativeConfig =
      std::make_shared<facebook::react::EmptyReactNativeConfig const>();
  _contextContainer->insert("ReactNativeConfig", _reactNativeConfig);
  _bridgeAdapter = [[RCTSurfacePresenterBridgeAdapter alloc]
        initWithBridge:bridge
      contextContainer:_contextContainer];
  bridge.surfacePresenter = _bridgeAdapter.surfacePresenter;
#endif

  NSDictionary *initProps = [self prepareInitialProps];
  UIView *rootView = [self.reactDelegate createRootViewWithBridge:bridge
                                                       moduleName:@"Comm"
                                                initialProperties:initProps];

  if (@available(iOS 13.0, *)) {
    rootView.backgroundColor = [UIColor systemBackgroundColor];
  } else {
    rootView.backgroundColor = [UIColor whiteColor];
  }

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController =
      [self.reactDelegate createRootViewController];
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

  ((RCTRootView *)rootView).loadingView = launchScreenView;
  ((RCTRootView *)rootView).loadingViewFadeDelay = 0;
  ((RCTRootView *)rootView).loadingViewFadeDuration = 0.001;

  return YES;
}

- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:
                (NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
  return [RCTLinkingManager application:application
                                openURL:url
                                options:options];
}

- (BOOL)application:(UIApplication *)application
    continueUserActivity:(nonnull NSUserActivity *)userActivity
      restorationHandler:
          (nonnull void (^)(NSArray<id<UIUserActivityRestoring>> *_Nullable))
              restorationHandler {
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge {
  // If you'd like to export some custom RCTBridgeModules that are not Expo
  // modules, add them here!
  return @[];
}

/// This method controls whether the `concurrentRoot`feature of React18 is
/// turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New
/// Architecture).
/// @return: `true` if the `concurrentRoot` feture is enabled. Otherwise, it
/// returns `false`.
- (BOOL)concurrentRootEnabled {
  // Switch this bool to turn on and off the concurrent root
  return true;
}
- (NSDictionary *)prepareInitialProps {
  NSMutableDictionary *initProps = [NSMutableDictionary new];
#ifdef RCT_NEW_ARCH_ENABLED
  initProps[kRNConcurrentRoot] = @([self concurrentRootEnabled]);
#endif
  return initProps;
}

- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  [CommIOSNotifications
      didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application
    didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [CommIOSNotifications didFailToRegisterForRemoteNotificationsWithError:error];
}

// Required for the notification event. You must call the completion handler
// after handling the remote notification.
- (void)application:(UIApplication *)application
    didReceiveRemoteNotification:(NSDictionary *)notification
          fetchCompletionHandler:
              (void (^)(UIBackgroundFetchResult))completionHandler {

  [CommIOSNotifications didReceiveRemoteNotification:notification
                              fetchCompletionHandler:completionHandler];
}

- (UIInterfaceOrientationMask)application:(UIApplication *)application
    supportedInterfaceOrientationsForWindow:(UIWindow *)window {
  return [Orientation getOrientation];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
#if DEBUG
  return
      [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main"
                                 withExtension:@"jsbundle"];
#endif
}

#if RCT_NEW_ARCH_ENABLED
#pragma mark - RCTCxxBridgeDelegate
- (std::unique_ptr<facebook::react::JSExecutorFactory>)
    jsExecutorFactoryForBridge:(RCTBridge *)bridge {
  _turboModuleManager =
      [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                           delegate:self
                                          jsInvoker:bridge.jsCallInvoker];
  return RCTAppSetupDefaultJsExecutorFactory(bridge, _turboModuleManager);
}
#pragma mark RCTTurboModuleManagerDelegate
- (Class)getModuleClassFromName:(const char *)name {
  return RCTCoreModulesClassProvider(name);
}
- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(const std::string &)name
         jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker {
  return nullptr;
}
- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(const std::string &)name
        initParams:
            (const facebook::react::ObjCTurboModule::InitParams &)params {
  return nullptr;
}
- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass {
  return RCTAppSetupDefaultModuleFromClass(moduleClass);
}
#endif

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
      std::shared_ptr<comm::CommCoreModule> coreNativeModule =
          std::make_shared<comm::CommCoreModule>(bridge.jsCallInvoker);
      std::shared_ptr<comm::CommUtilsModule> utilsNativeModule =
          std::make_shared<comm::CommUtilsModule>(bridge.jsCallInvoker);
      std::shared_ptr<comm::CommRustModule> rustNativeModule =
          std::make_shared<comm::CommRustModule>(bridge.jsCallInvoker);
      std::shared_ptr<comm::CommConstants> nativeConstants =
          std::make_shared<comm::CommConstants>();

      rt.global().setProperty(
          rt,
          facebook::jsi::PropNameID::forAscii(rt, "CommCoreModule"),
          facebook::jsi::Object::createFromHostObject(rt, coreNativeModule));
      rt.global().setProperty(
          rt,
          facebook::jsi::PropNameID::forAscii(rt, "CommUtilsModule"),
          facebook::jsi::Object::createFromHostObject(rt, utilsNativeModule));
      rt.global().setProperty(
          rt,
          facebook::jsi::PropNameID::forAscii(rt, "CommRustModule"),
          facebook::jsi::Object::createFromHostObject(rt, rustNativeModule));
      rt.global().setProperty(
          rt,
          facebook::jsi::PropNameID::forAscii(rt, "CommConstants"),
          facebook::jsi::Object::createFromHostObject(rt, nativeConstants));
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
  comm::GlobalDBSingleton::instance.scheduleOrRun([&sqliteFilePath]() {
    comm::DatabaseManager::initializeQueryExecutor(sqliteFilePath);
  });
}

- (void)moveMessagesToDatabase:(BOOL)sendBackgroundMessagesInfosToJS {
  TemporaryMessageStorage *temporaryStorage =
      [[TemporaryMessageStorage alloc] init];
  NSArray<NSString *> *messages = [temporaryStorage readAndClearMessages];
  for (NSString *message in messages) {
    if (sendBackgroundMessagesInfosToJS) {
      [CommIOSNotifications
          didReceiveBackgroundMessageInfos:@{@"messageInfos" : message}];
    }
    std::string messageInfos = std::string([message UTF8String]);
    comm::GlobalDBSingleton::instance.scheduleOrRun([messageInfos]() mutable {
      comm::MessageOperationsUtilities::storeMessageInfos(messageInfos);
    });
  }

  TemporaryMessageStorage *temporaryRescindsStorage =
      [[TemporaryMessageStorage alloc] initForRescinds];
  NSArray<NSString *> *rescindMessages =
      [temporaryRescindsStorage readAndClearMessages];
  for (NSString *rescindMessage in rescindMessages) {
    NSData *binaryRescindMessage =
        [rescindMessage dataUsingEncoding:NSUTF8StringEncoding];

    NSError *jsonError = nil;
    NSDictionary *rescindPayload =
        [NSJSONSerialization JSONObjectWithData:binaryRescindMessage
                                        options:0
                                          error:&jsonError];
    if (jsonError) {
      comm::Logger::log(
          "Failed to deserialize persisted rescind payload. Details: " +
          std::string([jsonError.localizedDescription UTF8String]));
      continue;
    }

    if (!(rescindPayload[setUnreadStatusKey] && rescindPayload[threadIDKey])) {
      continue;
    }

    std::string threadID =
        std::string([rescindPayload[threadIDKey] UTF8String]);
    comm::GlobalDBSingleton::instance.scheduleOrRun([threadID]() mutable {
      comm::ThreadOperations::updateSQLiteUnreadStatus(threadID, false);
    });
  }
}

- (void)didReceiveNewMessageInfosNSNotification:(NSNotification *)notification {
  [self moveMessagesToDatabase:YES];
}

- (void)registerForNewMessageInfosNotifications {
  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(didReceiveNewMessageInfosNSNotification:)
             name:newMessageInfosNSNotification
           object:nil];

  CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      (__bridge const void *)(self),
      didReceiveNewMessageInfosDarwinNotification,
      newMessageInfosDarwinNotification,
      NULL,
      CFNotificationSuspensionBehaviorDeliverImmediately);
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

#if DEBUG
  return vm::RuntimeConfig::Builder()
      .withGCConfig(gcConfigBuilder.build())
      .withEnableSampleProfiling(true)
      .build();
#else
  return vm::RuntimeConfig::Builder()
      .withGCConfig(gcConfigBuilder.build())
      .build();
#endif
}

@end
