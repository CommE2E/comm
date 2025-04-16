#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>

#import "CommIOSNotifications.h"
#import "Orientation.h"

#import <React/RCTBridge+Private.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#import <React/RCTLinkingManager.h>
#import <cxxreact/JSExecutor.h>
#import <jsireact/JSIExecutor.h>
#import <reacthermes/HermesExecutorFactory.h>

#import "CommConstants.h"
#import "CommCoreModule.h"
#import "CommIOSServicesClient.h"
#import "CommMMKV.h"
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
  comm::CommMMKV::initialize();
  return YES;
}

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  [self moveMessagesToDatabase:NO];
  [self scheduleNSEBlobsDeletion];
  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryAmbient
                                         error:nil];
  self.moduleName = @"Comm";

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // This prevents a very small flicker from occurring before expo-splash-screen
  // is able to display
  UIView *launchScreenView =
      [[UIStoryboard storyboardWithName:@"SplashScreen"
                                 bundle:nil] instantiateInitialViewController]
          .view;
  launchScreenView.frame = self.window.bounds;
  

  // ((RCTRootView *)rootView).loadingView = launchScreenView;
  // ((RCTRootView *)rootView).loadingViewFadeDelay = 0;
  // ((RCTRootView *)rootView).loadingViewFadeDuration = 0.001;
  

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
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

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
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

  if (sendBackgroundMessagesInfosToJS && messages && messages.count) {
    [CommIOSNotifications
        didReceiveBackgroundMessageInfos:@{@"messageInfosArray" : messages}];
  }

  for (NSString *message in messages) {
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
  [self scheduleNSEBlobsDeletion];
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

// NSE has limited time to process notifications. Therefore
// deferable and low priority networking such as fetched
// blob deletion from blob service should be handled by the
// main app on a low priority background thread.

- (void)scheduleNSEBlobsDeletion {
  dispatch_async(
      dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0), ^{
        [CommIOSServicesClient.sharedInstance deleteStoredBlobs];
      });
}

- (void)applicationWillResignActive:(UIApplication *)application {
  [[CommIOSServicesClient sharedInstance] cancelOngoingRequests];
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
