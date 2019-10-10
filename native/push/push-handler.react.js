// @flow

import type { AppState } from '../redux/redux-setup';
import type { DeviceType } from 'lib/types/device-types';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import {
  type RawThreadInfo,
  rawThreadInfoPropType,
} from 'lib/types/thread-types';
import {
  type NotifPermissionAlertInfo,
  notifPermissionAlertInfoPropType,
} from './alerts';
import {
  type ConnectionInfo,
  connectionInfoPropType,
} from 'lib/types/socket-types';
import type {
  RemoteMessage,
  NotificationOpen,
} from 'react-native-firebase';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  AppRegistry,
  Platform,
  AppState as NativeAppState,
  Alert,
} from 'react-native';
import NotificationsIOS from 'react-native-notifications';
import { Notification as InAppNotification } from 'react-native-in-app-message';

import { connect } from 'lib/utils/redux-utils';
import { unreadCount } from 'lib/selectors/thread-selectors';
import {
  setDeviceTokenActionTypes,
  setDeviceToken,
} from 'lib/actions/device-actions';
import { notificationPressActionType } from 'lib/shared/notif-utils';

import {
  recordNotifPermissionAlertActionType,
  clearAndroidNotificationsActionType,
} from '../redux/action-types';
import {
  activeThreadSelector,
  appLoggedInSelector,
} from '../selectors/nav-selectors';
import {
  requestIOSPushPermissions,
  iosPushPermissionResponseReceived,
} from './ios';
import {
  androidNotificationChannelID,
  handleAndroidMessage,
  androidBackgroundMessageTask,
} from './android';
import { getFirebase } from './firebase';
import { saveMessageInfos } from './utils';
import InAppNotif from './in-app-notif.react';

const msInDay = 24 * 60 * 60 * 1000;

type Props = {
  detectUnsupervisedBackground: ?((alreadyClosed: bool) => bool),
  // Redux state
  rehydrateConcluded: bool,
  unreadCount: number,
  activeThread: ?string,
  appLoggedIn: bool,
  deviceToken: ?string,
  rawThreadInfos: {[id: string]: RawThreadInfo},
  notifPermissionAlertInfo: NotifPermissionAlertInfo,
  connection: ConnectionInfo,
  updatesCurrentAsOf: number,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  setDeviceToken: (
    deviceToken: string,
    deviceType: DeviceType,
  ) => Promise<string>,
};
type State = {|
  inAppNotifProps: ?{|
    customComponent: React.Node,
    onPress: () => void,
  |};
|};
class PushHandler extends React.PureComponent<Props, State> {

  static propTypes = {
    detectUnsupervisedBackground: PropTypes.func,
    rehydrateConcluded: PropTypes.bool.isRequired,
    unreadCount: PropTypes.number.isRequired,
    activeThread: PropTypes.string,
    appLoggedIn: PropTypes.bool.isRequired,
    deviceToken: PropTypes.string,
    rawThreadInfos: PropTypes.objectOf(rawThreadInfoPropType).isRequired,
    notifPermissionAlertInfo: notifPermissionAlertInfoPropType.isRequired,
    connection: connectionInfoPropType.isRequired,
    updatesCurrentAsOf: PropTypes.number.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    setDeviceToken: PropTypes.func.isRequired,
  };
  state = {
    inAppNotifProps: null,
  };
  currentState: ?string = NativeAppState.currentState;
  appStarted = 0;
  androidTokenListener: ?(() => void) = null;
  androidMessageListener: ?(() => void) = null;
  androidNotifOpenListener: ?(() => void) = null;
  initialAndroidNotifHandled = false;
  openThreadOnceReceived: Set<string> = new Set();

  componentDidMount() {
    this.appStarted = Date.now();
    NativeAppState.addEventListener('change', this.handleAppStateChange);
    if (this.props.rehydrateConcluded) {
      this.onReduxRehydrate();
    }
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

  componentWillUnmount() {
    NativeAppState.removeEventListener('change', this.handleAppStateChange);
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

  handleAppStateChange = (nextState: ?string) => {
    if (!nextState || nextState === "unknown") {
      return;
    }
    const lastState = this.currentState;
    this.currentState = nextState;
    if (lastState === "background" && nextState === "active") {
      this.onForeground();
      this.clearNotifsOfThread();
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

  componentDidUpdate(prevProps: Props, prevState: State) {
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

    if (
      this.state.inAppNotifProps &&
      this.state.inAppNotifProps !== prevState.inAppNotifProps
    ) {
      InAppNotification.show();
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
          PushHandler.clearDeliveredIOSNotificationsForThread(
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
    if (this.props.detectUnsupervisedBackground) {
      this.props.detectUnsupervisedBackground(false);
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
    this.setState({
      inAppNotifProps: {
        customComponent: <InAppNotif title={title} message={message} />,
        onPress: () => {
          InAppNotification.hide();
          this.onPressNotificationForThread(threadID, false);
        },
      },
    });
  }

  androidNotificationOpened = async (notificationOpen: NotificationOpen) => {
    if (this.props.detectUnsupervisedBackground) {
      this.props.detectUnsupervisedBackground(false);
    }
    const { threadID } = notificationOpen.notification.data;
    this.onPressNotificationForThread(threadID, true);
  }

  androidMessageReceived = async (message: RemoteMessage) => {
    if (this.props.detectUnsupervisedBackground) {
      this.props.detectUnsupervisedBackground(false);
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
    return <InAppNotification {...this.state.inAppNotifProps} />;
  }

}

AppRegistry.registerHeadlessTask(
  'RNFirebaseBackgroundMessage',
  () => androidBackgroundMessageTask,
);

export default connect(
  (state: AppState) => ({
    rehydrateConcluded: state._persist && state._persist.rehydrated,
    unreadCount: unreadCount(state),
    activeThread: activeThreadSelector(state),
    appLoggedIn: appLoggedInSelector(state),
    deviceToken: state.deviceToken,
    rawThreadInfos: state.threadStore.threadInfos,
    notifPermissionAlertInfo: state.notifPermissionAlertInfo,
    connection: state.connection,
    updatesCurrentAsOf: state.updatesCurrentAsOf,
  }),
  { setDeviceToken },
)(PushHandler);
