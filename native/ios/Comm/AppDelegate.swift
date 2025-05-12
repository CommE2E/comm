import Expo
import React
import ReactAppDependencyProvider
import Foundation

let newMessageInfosNSNotification = Notification.Name("app.comm.ns_new_message_infos")
let newMessageInfosDarwinNotification: CFString = ("app.comm.darwin_new_message_infos") as CFString

func didReceiveNewMessageInfosDarwinNotification(
  center: CFNotificationCenter?,
  observer: UnsafeMutableRawPointer?,
  name: CFNotificationName?,
  object: UnsafeRawPointer?,
  userInfo: CFDictionary?
) {
  NotificationCenter.default.post(name: newMessageInfosNSNotification, object: nil)
}

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  
  public override func application(
    _ application: UIApplication,
    willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    DBInit.attemptDatabaseInitialization()
    registerForNewMessageInfosNotifications()
    DBInit.initMMKV()
    return true
  }

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    DBInit.moveMessages(toDatabase: false)
    scheduleNSEBlobsDeletion();
    do {
      try AVAudioSession.sharedInstance().setCategory(AVAudioSession.Category.ambient)
    } catch {
      
    }

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "Comm",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
  
  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    CommIOSNotifications.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
  }
  
  public override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    CommIOSNotifications.didFailToRegisterForRemoteNotificationsWithError(error)
  }
  
  // Required for the notification event. You must call the completion handler
  // after handling the remote notification.
  public override func application(
    _ application: UIApplication,
    didReceiveRemoteNotification notification: [AnyHashable : Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    CommIOSNotifications.didReceiveRemoteNotification(notification, fetchCompletionHandler: completionHandler)
  }
  
  @objc private func didReceiveNewMessageInfosNSNotification(notification: Notification) {
    DBInit.moveMessages(toDatabase: true)
    scheduleNSEBlobsDeletion()
  }
  
  private func registerForNewMessageInfosNotifications() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(self.didReceiveNewMessageInfosNSNotification(notification:)),
      name: newMessageInfosNSNotification,
      object: nil
    )
    
    CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque(),
      didReceiveNewMessageInfosDarwinNotification,
      newMessageInfosDarwinNotification,
      nil,
      CFNotificationSuspensionBehavior.deliverImmediately
    )
  }
  
  // NSE has limited time to process notifications. Therefore
  // deferable and low priority networking such as fetched
  // blob deletion from blob service should be handled by the
  // main app on a low priority background thread.
  
  private func scheduleNSEBlobsDeletion() {
    DispatchQueue.global(qos: .background).async {
      (CommIOSServicesClient.sharedInstance() as? CommIOSServicesClient)?.deleteStoredBlobs()
    }
  }
  
  public override func applicationWillResignActive(_ application: UIApplication) {
    (CommIOSServicesClient.sharedInstance() as? CommIOSServicesClient)?.cancelOngoingRequests()
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
