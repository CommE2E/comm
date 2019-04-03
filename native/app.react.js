// @flow

import type {
  NavigationState,
  NavigationAction,
} from 'react-navigation';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState } from './redux/redux-setup';
import type { Action } from './navigation/navigation-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { RawThreadInfo } from 'lib/types/thread-types';
import { rawThreadInfoPropType } from 'lib/types/thread-types';
import type { DeviceType } from 'lib/types/device-types';
import {
  type NotifPermissionAlertInfo,
  notifPermissionAlertInfoPropType,
} from './push/alerts';
import type { RawMessageInfo } from 'lib/types/message-types';
import {
  type ConnectionInfo,
  connectionInfoPropType,
} from 'lib/types/socket-types';

import React from 'react';
import { Provider } from 'react-redux';
import {
  AppRegistry,
  Platform,
  UIManager,
  AppState as NativeAppState,
  Linking,
  View,
  StyleSheet,
  Alert,
  DeviceInfo,
} from 'react-native';
import { createReduxContainer } from 'react-navigation-redux-helpers';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import NotificationsIOS from 'react-native-notifications';
import InAppNotification from 'react-native-in-app-notification';
import FCM, { FCMEvent } from 'react-native-fcm';
import SplashScreen from 'react-native-splash-screen';
import Orientation from 'react-native-orientation-locker';

import { connect } from 'lib/utils/redux-utils';
import {
  setDeviceTokenActionTypes,
  setDeviceToken,
} from 'lib/actions/device-actions';
import { unreadCount } from 'lib/selectors/thread-selectors';
import { notificationPressActionType } from 'lib/shared/notif-utils';
import { saveMessagesActionType } from 'lib/actions/message-actions';
import {
  backgroundActionType,
  foregroundActionType,
} from 'lib/reducers/foreground-reducer';

import {
  RootNavigator,
} from './navigation/navigation-setup';
import {
  handleURLActionType,
  recordNotifPermissionAlertActionType,
  recordAndroidNotificationActionType,
  clearAndroidNotificationActionType,
} from './navigation/action-types';
import { store, appBecameInactive } from './redux/redux-setup';
import ConnectedStatusBar from './connected-status-bar.react';
import {
  activeThreadSelector,
  appLoggedInSelector,
} from './selectors/nav-selectors';
import {
  requestIOSPushPermissions,
  iosPushPermissionResponseReceived,
} from './push/ios';
import {
  requestAndroidPushPermissions,
} from './push/android';
import NotificationBody from './push/notification-body.react';
import ErrorBoundary from './error-boundary.react';
import { AppRouteName } from './navigation/route-names';
import MessageStorePruner from './chat/message-store-pruner.react';
import DisconnectedBarVisibilityHandler
  from './navigation/disconnected-bar-visibility-handler.react';
import DimensionsUpdater from './redux/dimensions-updater.react';
import Socket from './socket.react';

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const msInDay = 24 * 60 * 60 * 1000;
// $FlowFixMe should be fixed on flow-bin@0.89
const ReduxifiedRootNavigator = createReduxContainer(RootNavigator);

type NativeDispatch = Dispatch & ((action: NavigationAction) => boolean);

type Props = {
  // Redux state
  rehydrateConcluded: bool,
  navigationState: NavigationState,
  activeThread: ?string,
  appLoggedIn: bool,
  loggedIn: bool,
  deviceToken: ?string,
  unreadCount: number,
  rawThreadInfos: {[id: string]: RawThreadInfo},
  notifPermissionAlertInfo: NotifPermissionAlertInfo,
  updatesCurrentAsOf: number,
  connection: ConnectionInfo,
  // Redux dispatch functions
  dispatch: NativeDispatch,
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  setDeviceToken: (
    deviceToken: string,
    deviceType: DeviceType,
  ) => Promise<string>,
};
class AppWithNavigationState extends React.PureComponent<Props> {

  static propTypes = {
    rehydrateConcluded: PropTypes.bool.isRequired,
    navigationState: PropTypes.object.isRequired,
    activeThread: PropTypes.string,
    appLoggedIn: PropTypes.bool.isRequired,
    loggedIn: PropTypes.bool.isRequired,
    deviceToken: PropTypes.string,
    unreadCount: PropTypes.number.isRequired,
    rawThreadInfos: PropTypes.objectOf(rawThreadInfoPropType).isRequired,
    notifPermissionAlertInfo: notifPermissionAlertInfoPropType.isRequired,
    updatesCurrentAsOf: PropTypes.number.isRequired,
    connection: connectionInfoPropType.isRequired,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    setDeviceToken: PropTypes.func.isRequired,
  };
  currentState: ?string = NativeAppState.currentState;
  inAppNotification: ?InAppNotification = null;
  androidNotifListener: ?Object = null;
  androidRefreshTokenListener: ?Object = null;
  initialAndroidNotifHandled = false;
  openThreadOnceReceived: Set<string> = new Set();
  appStarted = 0;
  detectUnsupervisedBackground: ?((alreadyClosed: bool) => bool);

  componentDidMount() {
    this.appStarted = Date.now();
    if (Platform.OS === "android") {
      setTimeout(SplashScreen.hide, 350);
    } else {
      SplashScreen.hide();
    }
    NativeAppState.addEventListener('change', this.handleAppStateChange);
    this.handleInitialURL();
    Linking.addEventListener('url', this.handleURLChange);
    if (this.props.rehydrateConcluded) {
      this.onReduxRehydrate();
    }
    Orientation.lockToPortrait();
  }

  onReduxRehydrate() {
    this.onForeground();
    if (Platform.OS === "ios") {
      NotificationsIOS.addEventListener(
        "remoteNotificationsRegistered",
        this.registerPushPermissions,
      );
      NotificationsIOS.addEventListener(
        "remoteNotificationsRegistrationFailed",
        this.failedToRegisterPushPermissions,
      );
      NotificationsIOS.addEventListener(
        "notificationReceivedForeground",
        this.iosForegroundNotificationReceived,
      );
      NotificationsIOS.addEventListener(
        "notificationOpened",
        this.iosNotificationOpened,
      );
    } else if (Platform.OS === "android") {
      FCM.createNotificationChannel({
        id: "default",
        name: "Default",
        description: "SquadCal notifications channel",
        priority: "high",
      });
      this.androidNotifListener = FCM.on(
        FCMEvent.Notification,
        this.androidNotificationReceived,
      );
      this.androidRefreshTokenListener = FCM.on(
        FCMEvent.RefreshToken,
        this.registerPushPermissionsAndHandleInitialNotif,
      );
    }
  }

  onForeground() {
    if (this.props.appLoggedIn) {
      this.ensurePushNotifsEnabled();
    } else if (this.props.deviceToken) {
      // We do this in case there was a crash, so we can clear deviceToken from
      // any other cookies it might be set for
      this.setDeviceToken(this.props.deviceToken);
    }
  }

  static updateBadgeCount(unreadCount: number) {
    if (Platform.OS === "ios") {
      NotificationsIOS.setBadgesCount(unreadCount);
    } else if (Platform.OS === "android") {
      FCM.setBadgeNumber(unreadCount);
    }
  }

  static clearNotifsOfThread(props: Props) {
    const activeThread = props.activeThread;
    invariant(activeThread, "activeThread should be set");
    if (Platform.OS === "ios") {
      NotificationsIOS.getDeliveredNotifications(
        (notifications) =>
          AppWithNavigationState.clearDeliveredIOSNotificationsForThread(
            activeThread,
            notifications,
          ),
      );
    } else if (Platform.OS === "android") {
      props.dispatchActionPayload(
        clearAndroidNotificationActionType,
        { threadID: activeThread },
      );
    }
  }

  static clearDeliveredIOSNotificationsForThread(
    threadID: string,
    notifications: Object[],
  ) {
    const identifiersToClear = [];
    for (let notification of notifications) {
      if (notification["thread-id"] === threadID) {
        identifiersToClear.push(notification.identifier);
      }
    }
    if (identifiersToClear) {
      NotificationsIOS.removeDeliveredNotifications(identifiersToClear);
    }
  }

  async handleInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) {
      this.dispatchActionForURL(url);
    }
  }

  componentWillUnmount() {
    NativeAppState.removeEventListener('change', this.handleAppStateChange);
    Linking.removeEventListener('url', this.handleURLChange);
    if (Platform.OS === "ios") {
      NotificationsIOS.removeEventListener(
        "remoteNotificationsRegistered",
        this.registerPushPermissions,
      );
      NotificationsIOS.removeEventListener(
        "remoteNotificationsRegistrationFailed",
        this.failedToRegisterPushPermissions,
      );
      NotificationsIOS.removeEventListener(
        "notificationReceivedForeground",
        this.iosForegroundNotificationReceived,
      );
      NotificationsIOS.removeEventListener(
        "notificationOpened",
        this.iosNotificationOpened,
      );
    } else if (Platform.OS === "android") {
      if (this.androidNotifListener) {
        this.androidNotifListener.remove();
        this.androidNotifListener = null;
      }
      if (this.androidRefreshTokenListener) {
        this.androidRefreshTokenListener.remove();
        this.androidRefreshTokenListener = null;
      }
    }
  }

  handleURLChange = (event: { url: string }) => {
    this.dispatchActionForURL(event.url);
  }

  dispatchActionForURL(url: string) {
    if (!url.startsWith("http")) {
      return;
    }
    this.props.dispatchActionPayload(handleURLActionType, url);
  }

  handleAppStateChange = (nextState: ?string) => {
    if (!nextState || nextState === "unknown") {
      return;
    }
    const lastState = this.currentState;
    this.currentState = nextState;
    if (lastState === "background" && nextState === "active") {
      this.props.dispatchActionPayload(foregroundActionType, null);
      this.onForeground();
      if (this.props.activeThread) {
        AppWithNavigationState.clearNotifsOfThread(this.props);
      }
    } else if (lastState !== "background" && nextState === "background") {
      this.props.dispatchActionPayload(backgroundActionType, null);
      appBecameInactive();
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    const nextActiveThread = nextProps.activeThread;
    if (nextActiveThread && nextActiveThread !== this.props.activeThread) {
      AppWithNavigationState.clearNotifsOfThread(nextProps);
    }

    if (
      nextProps.connection.status === "connected" &&
      (this.props.connection.status !== "connected" ||
        nextProps.unreadCount !== this.props.unreadCount)
    ) {
      AppWithNavigationState.updateBadgeCount(nextProps.unreadCount);
    }

    for (let threadID of this.openThreadOnceReceived) {
      const rawThreadInfo = nextProps.rawThreadInfos[threadID];
      if (rawThreadInfo) {
        this.navigateToThread(rawThreadInfo, false);
        this.openThreadOnceReceived.clear();
        break;
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.rehydrateConcluded && !prevProps.rehydrateConcluded) {
      this.onReduxRehydrate();
    } else if (
      (this.props.appLoggedIn && !prevProps.appLoggedIn) ||
      (!this.props.deviceToken && prevProps.deviceToken)
    ) {
      this.ensurePushNotifsEnabled();
    }
  }

  async ensurePushNotifsEnabled() {
    if (!this.props.appLoggedIn) {
      return;
    }
    if (Platform.OS === "ios") {
      const missingDeviceToken = this.props.deviceToken === null
        || this.props.deviceToken === undefined;
      await requestIOSPushPermissions(missingDeviceToken);
    } else if (Platform.OS === "android") {
      await this.ensureAndroidPushNotifsEnabled();
    }
  }

  async ensureAndroidPushNotifsEnabled() {
    const missingDeviceToken = this.props.deviceToken === null
      || this.props.deviceToken === undefined;
    let token = await this.getAndroidFCMToken();
    if (token) {
      await this.registerPushPermissionsAndHandleInitialNotif(token);
      return;
    }
    try {
      await FCM.deleteInstanceId();
    } catch (e) {
      this.failedToRegisterPushPermissions(e);
      return null;
    }
    token = await this.getAndroidFCMToken();
    if (token) {
      await this.registerPushPermissionsAndHandleInitialNotif(token);
    } else if (missingDeviceToken) {
      this.failedToRegisterPushPermissions();
    }
  }

  async getAndroidFCMToken() {
    try {
      return await requestAndroidPushPermissions();
    } catch (e) {
      this.failedToRegisterPushPermissions(e);
      return null;
    }
  }

  registerPushPermissionsAndHandleInitialNotif = async (
    deviceToken: string,
  ) => {
    this.registerPushPermissions(deviceToken);
    await this.handleInitialAndroidNotification();
  }

  async handleInitialAndroidNotification() {
    if (this.initialAndroidNotifHandled) {
      return;
    }
    this.initialAndroidNotifHandled = true;
    const initialNotif = await FCM.getInitialNotification();
    if (initialNotif) {
      await this.androidNotificationReceived(initialNotif, true);
    }
  }

  registerPushPermissions = (deviceToken: string) => {
    const deviceType = Platform.OS;
    if (deviceType !== "android" && deviceType !== "ios") {
      return;
    }
    if (deviceType === "ios") {
      iosPushPermissionResponseReceived();
    }
    if (deviceToken !== this.props.deviceToken) {
      this.setDeviceToken(deviceToken);
    }
  }

  setDeviceToken(deviceToken: string) {
    this.props.dispatchActionPromise(
      setDeviceTokenActionTypes,
      this.props.setDeviceToken(deviceToken, Platform.OS),
      undefined,
      deviceToken,
    );
  }

  failedToRegisterPushPermissions = (error) => {
    if (!this.props.appLoggedIn) {
      return;
    }
    const deviceType = Platform.OS;
    if (deviceType === "ios") {
      iosPushPermissionResponseReceived();
      if (__DEV__) {
        // iOS simulator can't handle notifs
        return;
      }
    }

    const alertInfo = this.props.notifPermissionAlertInfo;
    if (
      (alertInfo.totalAlerts > 3 &&
        alertInfo.lastAlertTime > (Date.now() - msInDay)) ||
      (alertInfo.totalAlerts > 6 &&
        alertInfo.lastAlertTime > (Date.now() - msInDay * 3)) ||
      (alertInfo.totalAlerts > 9 &&
        alertInfo.lastAlertTime > (Date.now() - msInDay * 7))
    ) {
      return;
    }
    this.props.dispatchActionPayload(
      recordNotifPermissionAlertActionType,
      { time: Date.now() },
    );

    if (deviceType === "ios") {
      Alert.alert(
        "Need notif permissions",
        "SquadCal needs notification permissions to keep you in the loop! " +
          "Please enable in Settings App -> Notifications -> SquadCal.",
        [ { text: 'OK' } ],
      );
    } else if (deviceType === "android") {
      Alert.alert(
        "Unable to initialize notifs!",
        "Please check your network connection, make sure Google Play " +
          "services are installed and enabled, and confirm that your Google " +
          "Play credentials are valid in the Google Play Store.",
      );
    }
  }

  navigateToThread(rawThreadInfo: RawThreadInfo, clearChatRoutes: bool) {
    this.props.dispatchActionPayload(
      notificationPressActionType,
      {
        rawThreadInfo,
        clearChatRoutes,
      },
    );
  }

  onPressNotificationForThread(threadID: string, clearChatRoutes: bool) {
    const rawThreadInfo = this.props.rawThreadInfos[threadID];
    if (rawThreadInfo) {
      this.navigateToThread(rawThreadInfo, clearChatRoutes);
    } else {
      this.openThreadOnceReceived.add(threadID);
    }
  }

  saveMessageInfos(messageInfosString: string) {
    const messageInfos: $ReadOnlyArray<RawMessageInfo> =
      JSON.parse(messageInfosString);
    const { updatesCurrentAsOf } = this.props;
    this.props.dispatchActionPayload(
      saveMessagesActionType,
      { rawMessageInfos: messageInfos, updatesCurrentAsOf },
    );
  }

  iosForegroundNotificationReceived = (notification) => {
    if (
      notification.getData() &&
      notification.getData().managedAps &&
      notification.getData().managedAps.action === "CLEAR"
    ) {
      notification.finish(NotificationsIOS.FetchResult.NoData);
      return;
    }
    if (Date.now() < this.appStarted + 1500) {
      // On iOS, when the app is opened from a notif press, for some reason this
      // callback gets triggered before iosNotificationOpened. In fact this
      // callback shouldn't be triggered at all. To avoid weirdness we are
      // ignoring any foreground notification received within the first second
      // of the app being started, since they are most likely to be erroneous.
      notification.finish(NotificationsIOS.FetchResult.NoData);
      return;
    }
    const threadID = notification.getData().threadID;
    if (!threadID) {
      console.log("Notification with missing threadID received!");
      notification.finish(NotificationsIOS.FetchResult.NoData);
      return;
    }
    const messageInfos = notification.getData().messageInfos;
    if (messageInfos) {
      this.saveMessageInfos(messageInfos);
    }
    this.showInAppNotification(threadID, notification.getMessage());
    notification.finish(NotificationsIOS.FetchResult.NewData);
  }

  iosNotificationOpened = (notification) => {
    if (this.detectUnsupervisedBackground) {
      this.detectUnsupervisedBackground(false);
    }
    const threadID = notification.getData().threadID;
    if (!threadID) {
      console.log("Notification with missing threadID received!");
      notification.finish(NotificationsIOS.FetchResult.NoData);
      return;
    }
    const messageInfos = notification.getData().messageInfos;
    if (messageInfos) {
      this.saveMessageInfos(messageInfos);
    }
    this.onPressNotificationForThread(threadID, true),
    notification.finish(NotificationsIOS.FetchResult.NewData);
  }

  showInAppNotification(threadID: string, message: string) {
    if (threadID === this.props.activeThread) {
      return;
    }
    invariant(this.inAppNotification, "should be set");
    this.inAppNotification.show({
      message,
      onPress: () => this.onPressNotificationForThread(threadID, false),
    });
  }

  // This function gets called when:
  // - The app is open (either foreground or background) and a notif is
  //   received. In this case, notification has a custom_notification property.
  //   custom_notification can have either a new notif or a payload indicating a
  //   notif should be rescinded. In both cases, the native side will handle
  //   presenting or rescinding the notif.
  // - The app is open and a notif is pressed. In this case, notification has a
  //   body property.
  // - The app is closed and a notif is pressed. This is possible because when
  //   the app is closed and a notif is recevied, the native side will boot up
  //   to process it. However, in this case, this function does not get
  //   triggered when the notif is received - only when it is pressed.
  androidNotificationReceived = async (
    notification,
    appOpenedFromNotif = false,
  ) => {
    if (appOpenedFromNotif && notification.messageInfos) {
      // This indicates that while the app was closed (not backgrounded), a
      // notif was delivered to the native side, which presented a local notif.
      // The local notif was then pressed, opening the app and triggering here.
      // Normally, this callback is called initially when the local notif is
      // generated, and at that point the MessageInfos get saved. But in the
      // case of a notif press opening the app, that doesn't happen, so we'll
      // save the notifs here.
      this.saveMessageInfos(notification.messageInfos);
    }

    if (notification.body) {
      // This indicates that we're being called because a notif was pressed
      this.onPressNotificationForThread(notification.threadID, true);
      return;
    }

    if (notification.custom_notification) {
      const customNotification = JSON.parse(notification.custom_notification);
      if (customNotification.rescind === "true") {
        // We have nothing to do on the JS thread in the case of a rescind
        return;
      }

      const threadID = customNotification.threadID;
      if (!threadID) {
        console.log("Server notification with missing threadID received!");
        return;
      }

      // We are here because notif was received, but hasn't been pressed yet
      if (this.detectUnsupervisedBackground) {
        this.detectUnsupervisedBackground(false);
      }
      this.saveMessageInfos(customNotification.messageInfos);

      if (this.currentState === "active") {
        // In the case where the app is in the foreground, we will show an
        // in-app notif
        this.showInAppNotification(threadID, customNotification.body);
      } else {
        // We keep track of what notifs have been rendered for a given thread so
        // that we can clear them immediately (without waiting for the rescind)
        // when the user navigates to that thread. Since we can't do this while
        // the app is closed, we rely on the rescind notif in that case.
        this.props.dispatchActionPayload(
          recordAndroidNotificationActionType,
          {
            threadID,
            notifID: customNotification.id,
          },
        );
      }
    }
  }

  render() {
    const inAppNotificationHeight = DeviceInfo.isIPhoneX_deprecated ? 104 : 80;
    return (
      <View style={styles.app}>
        <Socket
          detectUnsupervisedBackgroundRef={this.detectUnsupervisedBackgroundRef}
        />
        <ReduxifiedRootNavigator
          state={this.props.navigationState}
          dispatch={this.props.dispatch}
        />
        <ConnectedStatusBar />
        <InAppNotification
          height={inAppNotificationHeight}
          notificationBodyComponent={NotificationBody}
          ref={this.inAppNotificationRef}
        />
        <MessageStorePruner />
        <DisconnectedBarVisibilityHandler />
        <DimensionsUpdater />
      </View>
    );
  }

  inAppNotificationRef = (inAppNotification: InAppNotification) => {
    this.inAppNotification = inAppNotification;
  }

  detectUnsupervisedBackgroundRef = (
    detectUnsupervisedBackground: ?((alreadyClosed: bool) => bool),
  ) => {
    this.detectUnsupervisedBackground = detectUnsupervisedBackground;
  }

}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
});

const ConnectedAppWithNavigationState = connect(
  (state: AppState) => {
    const appLoggedIn = appLoggedInSelector(state);
    return {
      rehydrateConcluded: state._persist && state._persist.rehydrated,
      navigationState: state.navInfo.navigationState,
      activeThread: activeThreadSelector(state),
      appLoggedIn,
      loggedIn: appLoggedIn &&
        !!(state.currentUserInfo && !state.currentUserInfo.anonymous && true),
      deviceToken: state.deviceToken,
      unreadCount: unreadCount(state),
      rawThreadInfos: state.threadStore.threadInfos,
      notifPermissionAlertInfo: state.notifPermissionAlertInfo,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      connection: state.connection,
    };
  },
  { setDeviceToken },
)(AppWithNavigationState);

const App = (props: {}) =>
  <Provider store={store}>
    <ErrorBoundary>
      <ConnectedAppWithNavigationState />
    </ErrorBoundary>
  </Provider>;
AppRegistry.registerComponent('SquadCal', () => App);
