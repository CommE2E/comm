#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import "RNNotifications.h"
#import "Orientation.h"

#import <UMCore/UMModuleRegistry.h>
#import <UMReactNativeAdapter/UMNativeModulesProxy.h>
#import <UMReactNativeAdapter/UMModuleRegistryAdapter.h>
#import <EXSplashScreen/EXSplashScreenService.h>

#import <reacthermes/HermesExecutorFactory.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#import <React/RCTBridge+Private.h>
#import <cxxreact/JSExecutor.h>
#import <jsireact/JSIExecutor.h>

#import <EXSecureStore/EXSecureStore.h>
#import <UMReactNativeAdapter/UMNativeModulesProxy.h>

#import <string>

#import "Tools.h"
#import "CommCoreModule.h"
#import "SQLiteQueryExecutor.h"
#import "CommSecureStoreIOSWrapper.h"

#ifdef FB_SONARKIT_ENABLED
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>
static void InitializeFlipper(UIApplication *application) {
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [client addPlugin:[[FlipperKitLayoutPlugin alloc] initWithRootNode:application withDescriptorMapper:layoutDescriptorMapper]];
  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client addPlugin:[[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client start];
}
#endif

#import <ReactCommon/RCTTurboModuleManager.h>

#import <RNReanimated/NativeProxy.h>
#import <RNReanimated/REAModule.h>
#import <RNReanimated/REAEventDispatcher.h>

@interface AppDelegate()
  <RCTCxxBridgeDelegate, RCTTurboModuleManagerDelegate> {}
@end

extern RCTBridge *_bridge_reanimated;

@interface RCTEventDispatcher (Reanimated)

- (void)setBridge:(RCTBridge*)bridge;

@end

@interface UMNativeModulesProxy ()
@property (nonatomic, strong) UMModuleRegistry *moduleRegistry;
@end

@interface CommSecureStoreIOSWrapper()
- (void)init:(EXSecureStore *)secureStore;
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#ifdef FB_SONARKIT_ENABLED
  InitializeFlipper(application);
#endif

  self.moduleRegistryAdapter = [[UMModuleRegistryAdapter alloc] initWithModuleRegistryProvider:[[UMModuleRegistryProvider alloc] init]];
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
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

  // This prevents a very small flicker from occurring before expo-splash-screen is able to display
  UIView* launchScreenView = [[UIStoryboard storyboardWithName:@"SplashScreen" bundle:nil] instantiateInitialViewController].view;
  launchScreenView.frame = self.window.bounds;
  rootView.loadingView = launchScreenView;
  rootView.loadingViewFadeDelay = 0;
  rootView.loadingViewFadeDuration = 0.001;

  // This sets up the splash screen to display until the JS side is ready for it to clear
  EXSplashScreenService *splashScreenService = (EXSplashScreenService *)[UMModuleRegistryProvider getSingletonModuleForClass:[EXSplashScreenService class]];
  [splashScreenService showSplashScreenFor:rootViewController];
  
  UMNativeModulesProxy *proxy = [bridge moduleForClass:[UMNativeModulesProxy class]];
  UMModuleRegistry *moduleRegistry = [proxy moduleRegistry];
  EXSecureStore *secureStore = [moduleRegistry getExportedModuleOfClass:[EXSecureStore class]];
  [[CommSecureStoreIOSWrapper sharedInstance] init:secureStore];

  return YES;
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
  NSArray<id<RCTBridgeModule>> *extraModules = [_moduleRegistryAdapter extraModulesForBridge:bridge];
  // You can inject any extra modules that you would like here, more information at:
  // https://facebook.github.io/react-native/docs/native-modules-ios.html#dependency-injection
  return extraModules;
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RNNotifications didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [RNNotifications didFailToRegisterForRemoteNotificationsWithError:error];
}

// Required for the notification event. You must call the completion handler after handling the remote notification.
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)notification
                                                       fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [RNNotifications didReceiveRemoteNotification:notification fetchCompletionHandler:completionHandler];
}

// Required for the localNotification event.
- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification
{
  [RNNotifications didReceiveLocalNotification:notification];
}

- (UIInterfaceOrientationMask)application:(UIApplication *)application supportedInterfaceOrientationsForWindow:(UIWindow *)window {
  return [Orientation getOrientation];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

using ExecutorFactory = facebook::react::HermesExecutorFactory;
using Runtime = facebook::jsi::Runtime;

- (std::unique_ptr<ExecutorFactory>)jsExecutorFactoryForBridge
    :(RCTBridge *)bridge {
  __weak __typeof(self) weakSelf = self;

  // The following code to setup Reanimated is copied from UIResponder+Reanimated.mm
  [bridge moduleForClass:[RCTEventDispatcher class]];
  RCTEventDispatcher *eventDispatcher = [REAEventDispatcher new];
  [eventDispatcher setBridge:bridge];
  [bridge updateModuleWithInstance:eventDispatcher];
  _bridge_reanimated = bridge;

  const auto executor = [weakSelf, bridge](facebook::jsi::Runtime &rt) {
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
        facebook::jsi::Object::createFromHostObject(rt, nativeModule)
      );

      // set sqlite file path
      comm::SQLiteQueryExecutor::sqliteFilePath = 
        std::string([[Tools getSQLiteFilePath] UTF8String]);

      auto reanimatedModule = reanimated::createReanimatedModule(bridge.jsCallInvoker);
      rt.global().setProperty(
        rt,
        facebook::jsi::PropNameID::forAscii(rt, "__reanimatedModuleProxy"),
        facebook::jsi::Object::createFromHostObject(rt, reanimatedModule)
      );
    }
  };

  return std::make_unique<ExecutorFactory>(
    facebook::react::RCTJSIExecutorRuntimeInstaller(executor),
    JSIExecutor::defaultTimeoutInvoker,
    makeRuntimeConfig(1024)
  );
}

// Copied from ReactAndroid/src/main/java/com/facebook/hermes/reactexecutor/OnLoad.cpp
static ::hermes::vm::RuntimeConfig makeRuntimeConfig(
  ::hermes::vm::gcheapsize_t heapSizeMB
) {
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
