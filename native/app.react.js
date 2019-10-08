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
import {
  type ConnectionInfo,
  connectionInfoPropType,
} from 'lib/types/socket-types';
import type {
  RemoteMessage,
  Notification,
  NotificationOpen,
} from 'react-native-firebase';

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
import {
  InAppNotificationProvider,
  withInAppNotification,
} from 'react-native-in-app-notification';
import SplashScreen from 'react-native-splash-screen';
import Orientation from 'react-native-orientation-locker';

import { connect } from 'lib/utils/redux-utils';
import {
  setDeviceTokenActionTypes,
  setDeviceToken,
} from 'lib/actions/device-actions';
import { unreadCount } from 'lib/selectors/thread-selectors';
import { notificationPressActionType } from 'lib/shared/notif-utils';
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
  clearAndroidNotificationsActionType,
} from './redux/action-types';
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
  androidNotificationChannelID,
  handleAndroidMessage,
  androidBackgroundMessageTask,
} from './push/android';
import { getFirebase } from './push/firebase';
import { saveMessageInfos } from './push/utils';
import NotificationBody from './push/notification-body.react';
import ErrorBoundary from './error-boundary.react';
import { AppRouteName } from './navigation/route-names';
import DisconnectedBarVisibilityHandler
  from './navigation/disconnected-bar-visibility-handler.react';
import DimensionsUpdater from './redux/dimensions-updater.react';
import ConnectivityUpdater from './redux/connectivity-updater.react';
import Socket from './socket.react';

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const msInDay = 24 * 60 * 60 * 1000;
const ReduxifiedRootNavigator = createReduxContainer(RootNavigator);
const defaultStatusBarStyle = Platform.OS === "ios"
  ? "dark-content"
  : "default";

type NativeDispatch = Dispatch & ((action: NavigationAction) => boolean);

type Props = {
  // withInAppNotification
  showNotification: (spec: {...}) => void,
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
    showNotification: PropTypes.func.isRequired,
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
  androidTokenListener: ?(() => void) = null;
  androidMessageListener: ?(() => void) = null;
  androidNotifOpenListener: ?(() => void) = null;
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
      const firebase = getFirebase();
      const channel = new firebase.notifications.Android.Channel(
        androidNotificationChannelID,
        'Default',
        firebase.notifications.Android.Importance.Max,
      ).setDescription("SquadCal notifications channel");
      firebase.notifications().android.createChannel(channel);
      this.androidTokenListener =
        firebase.messaging().onTokenRefresh(this.handleAndroidDeviceToken);
      this.androidMessageListener =
        firebase.messaging().onMessage(this.androidMessageReceived);
      this.androidNotifOpenListener =
        firebase.notifications().onNotificationOpened(
          this.androidNotificationOpened,
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

  updateBadgeCount() {
    const { unreadCount } = this.props;
    if (Platform.OS === "ios") {
      NotificationsIOS.setBadgesCount(unreadCount);
    } else if (Platform.OS === "android") {
      getFirebase().notifications().setBadge(unreadCount);
    }
  }

  clearNotifsOfThread() {
    const { activeThread } = this.props;
    if (!activeThread) {
      return;
    }
    if (Platform.OS === "ios") {
      NotificationsIOS.getDeliveredNotifications(
        (notifications) =>
          AppWithNavigationState.clearDeliveredIOSNotificationsForThread(
            activeThread,
            notifications,
          ),
      );
    } else if (Platform.OS === "android") {
      this.props.dispatchActionPayload(
        clearAndroidNotificationsActionType,
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
      if (this.androidTokenListener) {
        this.androidTokenListener();
        this.androidTokenListener = null;
      }
      if (this.androidMessageListener) {
        this.androidMessageListener();
        this.androidMessageListener = null;
      }
      if (this.androidNotifOpenListener) {
        this.androidNotifOpenListener();
        this.androidNotifOpenListener = null;
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
      this.clearNotifsOfThread();
    } else if (lastState !== "background" && nextState === "background") {
      this.props.dispatchActionPayload(backgroundActionType, null);
      appBecameInactive();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.activeThread !== prevProps.activeThread) {
      this.clearNotifsOfThread();
    }

    if (
      this.props.connection.status === "connected" &&
      (prevProps.connection.status !== "connected" ||
        this.props.unreadCount !== prevProps.unreadCount)
    ) {
      this.updateBadgeCount();
    }

    for (let threadID of this.openThreadOnceReceived) {
      const rawThreadInfo = this.props.rawThreadInfos[threadID];
      if (rawThreadInfo) {
        this.navigateToThread(rawThreadInfo, false);
        this.openThreadOnceReceived.clear();
        break;
      }
    }

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
    const firebase = getFirebase();
    const hasPermission = await firebase.messaging().hasPermission();
    if (!hasPermission) {
      try {
        await firebase.messaging().requestPermission();
      } catch (error) {
        this.failedToRegisterPushPermissions();
        return;
      }
    }

    const fcmToken = await firebase.messaging().getToken();
    if (fcmToken) {
      await this.handleAndroidDeviceToken(fcmToken);
    } else {
      this.failedToRegisterPushPermissions();
    }
  }

  handleAndroidDeviceToken = async (deviceToken: string) => {
    this.registerPushPermissions(deviceToken);
    await this.handleInitialAndroidNotification();
  }

  async handleInitialAndroidNotification() {
    if (this.initialAndroidNotifHandled) {
      return;
    }
    this.initialAndroidNotifHandled = true;
    const initialNotif =
      await getFirebase().notifications().getInitialNotification();
    if (initialNotif) {
      await this.androidNotificationOpened(initialNotif);
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
    saveMessageInfos(
      messageInfosString,
      this.props.updatesCurrentAsOf,
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

  showInAppNotification(threadID: string, message: string, title?: ?string) {
    if (threadID === this.props.activeThread) {
      return;
    }
    this.props.showNotification({
      message,
      title,
      onPress: () => this.onPressNotificationForThread(threadID, false),
    });
  }

  androidNotificationOpened = async (notificationOpen: NotificationOpen) => {
    if (this.detectUnsupervisedBackground) {
      this.detectUnsupervisedBackground(false);
    }
    const { threadID } = notificationOpen.notification.data;
    this.onPressNotificationForThread(threadID, true);
  }

  androidMessageReceived = async (message: RemoteMessage) => {
    if (this.detectUnsupervisedBackground) {
      this.detectUnsupervisedBackground(false);
    }
    handleAndroidMessage(
      message,
      this.props.updatesCurrentAsOf,
      this.handleAndroidNotificationIfActive,
    );
  }

  handleAndroidNotificationIfActive = (
    threadID: string,
    texts: {| body: string, title: ?string |},
  ) => {
    if (this.currentState !== "active") {
      return false;
    }
    this.showInAppNotification(threadID, texts.body, texts.title);
    return true;
  }

  render() {
    const inAppNotificationHeight = DeviceInfo.isIPhoneX_deprecated ? 104 : 80;
    return (
      <InAppNotificationProvider
        height={inAppNotificationHeight}
        notificationBodyComponent={NotificationBody}
      >
        <View style={styles.app}>
          <Socket
            detectUnsupervisedBackgroundRef={this.detectUnsupervisedBackgroundRef}
          />
          <ReduxifiedRootNavigator
            state={this.props.navigationState}
            dispatch={this.props.dispatch}
          />
          <ConnectedStatusBar barStyle={defaultStatusBarStyle} />
          <DisconnectedBarVisibilityHandler />
          <DimensionsUpdater />
          <ConnectivityUpdater />
        </View>
      </InAppNotificationProvider>
    );
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
)(withInAppNotification(AppWithNavigationState));

const App = (props: {}) =>
  <Provider store={store}>
    <ErrorBoundary>
      <ConnectedAppWithNavigationState />
    </ErrorBoundary>
  </Provider>;
AppRegistry.registerComponent('SquadCal', () => App);
AppRegistry.registerHeadlessTask(
  'RNFirebaseBackgroundMessage',
  () => androidBackgroundMessageTask,
);
