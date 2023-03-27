// @flow

import * as Haptics from 'expo-haptics';
import * as React from 'react';
import { Platform, Alert, LogBox } from 'react-native';
import { Notification as InAppNotification } from 'react-native-in-app-message';
import { useDispatch } from 'react-redux';

import {
  setDeviceTokenActionTypes,
  setDeviceToken,
} from 'lib/actions/device-actions.js';
import { saveMessagesActionType } from 'lib/actions/message-actions.js';
import {
  unreadCount,
  threadInfoSelector,
} from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { mergePrefixIntoBody } from 'lib/shared/notif-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import { type ConnectionInfo } from 'lib/types/socket-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils.js';
import {
  type NotifPermissionAlertInfo,
  recordNotifPermissionAlertActionType,
  shouldSkipPushPermissionAlert,
} from 'lib/utils/push-alerts.js';
import sleep from 'lib/utils/sleep.js';

import {
  androidNotificationChannelID,
  handleAndroidMessage,
  getCommAndroidNotificationsEventEmitter,
  type AndroidMessage,
  CommAndroidNotifications,
} from './android.js';
import {
  CommIOSNotification,
  type CoreIOSNotificationData,
  type CoreIOSNotificationDataWithRequestIdentifier,
} from './comm-ios-notification.js';
import InAppNotif from './in-app-notif.react.js';
import {
  requestIOSPushPermissions,
  iosPushPermissionResponseReceived,
  CommIOSNotifications,
  getCommIOSNotificationsEventEmitter,
} from './ios.js';
import {
  type MessageListParams,
  useNavigateToThread,
} from '../chat/message-list-types.js';
import {
  addLifecycleListener,
  getCurrentLifecycleState,
} from '../lifecycle/lifecycle.js';
import { replaceWithThreadActionType } from '../navigation/action-types.js';
import { activeMessageListSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { RootContext, type RootContextType } from '../root-context.js';
import type { EventSubscription } from '../types/react-native.js';
import { type GlobalTheme } from '../types/themes.js';

LogBox.ignoreLogs([
  // react-native-in-app-message
  'ForceTouchGestureHandler is not available',
]);

type BaseProps = {
  +navigation: RootNavigationProp<'App'>,
};
type Props = {
  ...BaseProps,
  // Navigation state
  +activeThread: ?string,
  // Redux state
  +unreadCount: number,
  +deviceToken: ?string,
  +threadInfos: { +[id: string]: ThreadInfo },
  +notifPermissionAlertInfo: NotifPermissionAlertInfo,
  +connection: ConnectionInfo,
  +updatesCurrentAsOf: number,
  +activeTheme: ?GlobalTheme,
  +loggedIn: boolean,
  +navigateToThread: (params: MessageListParams) => void,
  // Redux dispatch functions
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +setDeviceToken: (deviceToken: ?string) => Promise<?string>,
  // withRootContext
  +rootContext: ?RootContextType,
};
type State = {
  +inAppNotifProps: ?{
    +customComponent: React.Node,
    +blurType: ?('xlight' | 'dark'),
    +onPress: () => void,
  },
};

class PushHandler extends React.PureComponent<Props, State> {
  state: State = {
    inAppNotifProps: null,
  };
  currentState: ?string = getCurrentLifecycleState();
  appStarted = 0;
  androidNotificationsEventSubscriptions: Array<EventSubscription> = [];
  androidNotificationsPermissionPromise: ?Promise<boolean> = undefined;
  initialAndroidNotifHandled = false;
  openThreadOnceReceived: Set<string> = new Set();
  lifecycleSubscription: ?EventSubscription;
  iosNotificationEventSubscriptions: Array<EventSubscription> = [];

  componentDidMount() {
    this.appStarted = Date.now();
    this.lifecycleSubscription = addLifecycleListener(
      this.handleAppStateChange,
    );
    this.onForeground();
    if (Platform.OS === 'ios') {
      const commIOSNotificationsEventEmitter =
        getCommIOSNotificationsEventEmitter();
      this.iosNotificationEventSubscriptions.push(
        commIOSNotificationsEventEmitter.addListener(
          'remoteNotificationsRegistered',
          registration =>
            this.registerPushPermissions(registration?.deviceToken),
        ),
        commIOSNotificationsEventEmitter.addListener(
          'remoteNotificationsRegistrationFailed',
          this.failedToRegisterPushPermissionsIOS,
        ),
        commIOSNotificationsEventEmitter.addListener(
          'notificationReceivedForeground',
          this.iosForegroundNotificationReceived,
        ),
        commIOSNotificationsEventEmitter.addListener(
          'notificationOpened',
          this.iosNotificationOpened,
        ),
      );
    } else if (Platform.OS === 'android') {
      CommAndroidNotifications.createChannel(
        androidNotificationChannelID,
        'Default',
        CommAndroidNotifications.getConstants().NOTIFICATIONS_IMPORTANCE_HIGH,
        'Comm notifications channel',
      );
      const commAndroidNotificationsEventEmitter =
        getCommAndroidNotificationsEventEmitter();
      this.androidNotificationsEventSubscriptions.push(
        commAndroidNotificationsEventEmitter.addListener(
          'commAndroidNotificationsToken',
          this.handleAndroidDeviceToken,
        ),
        commAndroidNotificationsEventEmitter.addListener(
          'commAndroidNotificationsMessage',
          this.androidMessageReceived,
        ),
        commAndroidNotificationsEventEmitter.addListener(
          'commAndroidNotificationsNotificationOpened',
          this.androidNotificationOpened,
        ),
      );
    }

    if (this.props.connection.status === 'connected') {
      this.updateBadgeCount();
    }
  }

  componentWillUnmount() {
    if (this.lifecycleSubscription) {
      this.lifecycleSubscription.remove();
    }
    if (Platform.OS === 'ios') {
      for (const iosNotificationEventSubscription of this
        .iosNotificationEventSubscriptions) {
        iosNotificationEventSubscription.remove();
      }
    } else if (Platform.OS === 'android') {
      for (const androidNotificationsEventSubscription of this
        .androidNotificationsEventSubscriptions) {
        androidNotificationsEventSubscription.remove();
      }
      this.androidNotificationsEventSubscriptions = [];
    }
  }

  handleAppStateChange = (nextState: ?string) => {
    if (!nextState || nextState === 'unknown') {
      return;
    }
    const lastState = this.currentState;
    this.currentState = nextState;
    if (lastState === 'background' && nextState === 'active') {
      this.onForeground();
      this.clearNotifsOfThread();
    }
  };

  onForeground() {
    if (this.props.loggedIn) {
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
      this.props.connection.status === 'connected' &&
      (prevProps.connection.status !== 'connected' ||
        this.props.unreadCount !== prevProps.unreadCount)
    ) {
      this.updateBadgeCount();
    }

    for (const threadID of this.openThreadOnceReceived) {
      const threadInfo = this.props.threadInfos[threadID];
      if (threadInfo) {
        this.navigateToThread(threadInfo, false);
        this.openThreadOnceReceived.clear();
        break;
      }
    }

    if (
      (this.props.loggedIn && !prevProps.loggedIn) ||
      (!this.props.deviceToken && prevProps.deviceToken)
    ) {
      this.ensurePushNotifsEnabled();
    }

    if (!this.props.loggedIn && prevProps.loggedIn) {
      this.clearAllNotifs();
    }

    if (
      this.state.inAppNotifProps &&
      this.state.inAppNotifProps !== prevState.inAppNotifProps
    ) {
      Haptics.notificationAsync();
      InAppNotification.show();
    }
  }

  updateBadgeCount() {
    const curUnreadCount = this.props.unreadCount;
    if (Platform.OS === 'ios') {
      CommIOSNotifications.setBadgesCount(curUnreadCount);
    } else if (Platform.OS === 'android') {
      CommAndroidNotifications.setBadge(curUnreadCount);
    }
  }

  clearAllNotifs() {
    if (Platform.OS === 'ios') {
      CommIOSNotifications.removeAllDeliveredNotifications();
    } else if (Platform.OS === 'android') {
      CommAndroidNotifications.removeAllDeliveredNotifications();
    }
  }

  clearNotifsOfThread() {
    const { activeThread } = this.props;
    if (!activeThread) {
      return;
    }
    if (Platform.OS === 'ios') {
      CommIOSNotifications.getDeliveredNotifications(notifications =>
        PushHandler.clearDeliveredIOSNotificationsForThread(
          activeThread,
          notifications,
        ),
      );
    } else if (Platform.OS === 'android') {
      CommAndroidNotifications.removeAllActiveNotificationsForThread(
        activeThread,
      );
    }
  }

  static clearDeliveredIOSNotificationsForThread(
    threadID: string,
    notifications: $ReadOnlyArray<CoreIOSNotificationDataWithRequestIdentifier>,
  ) {
    const identifiersToClear = [];
    for (const notification of notifications) {
      if (notification.threadID === threadID) {
        identifiersToClear.push(notification.identifier);
      }
    }
    if (identifiersToClear) {
      CommIOSNotifications.removeDeliveredNotifications(identifiersToClear);
    }
  }

  async ensurePushNotifsEnabled() {
    if (!this.props.loggedIn) {
      return;
    }
    if (Platform.OS === 'ios') {
      const missingDeviceToken =
        this.props.deviceToken === null || this.props.deviceToken === undefined;
      await requestIOSPushPermissions(missingDeviceToken);
    } else if (Platform.OS === 'android') {
      await this.ensureAndroidPushNotifsEnabled();
    }
  }

  async ensureAndroidPushNotifsEnabled() {
    const permissionPromisesResult = await Promise.all([
      CommAndroidNotifications.hasPermission(),
      CommAndroidNotifications.canRequestNotificationsPermissionFromUser(),
    ]);

    let [hasPermission] = permissionPromisesResult;
    const [, canRequestPermission] = permissionPromisesResult;

    if (!hasPermission && canRequestPermission) {
      const permissionResponse = await (async () => {
        // We issue a call to sleep to match iOS behavior where prompt
        // doesn't appear immediately but after logged-out modal disappears
        await sleep(10);
        await this.requestAndroidNotificationsPermission();
      })();
      hasPermission = permissionResponse;
    }

    if (!hasPermission) {
      this.failedToRegisterPushPermissionsAndroid(!canRequestPermission);
      return;
    }

    try {
      const fcmToken = await CommAndroidNotifications.getToken();
      await this.handleAndroidDeviceToken(fcmToken);
    } catch (e) {
      this.failedToRegisterPushPermissionsAndroid(!canRequestPermission);
    }
  }

  requestAndroidNotificationsPermission = () => {
    if (!this.androidNotificationsPermissionPromise) {
      this.androidNotificationsPermissionPromise = (async () => {
        const notifPermission =
          await CommAndroidNotifications.requestNotificationsPermission();
        this.androidNotificationsPermissionPromise = undefined;
        return notifPermission;
      })();
    }
    return this.androidNotificationsPermissionPromise;
  };

  handleAndroidDeviceToken = async (deviceToken: string) => {
    this.registerPushPermissions(deviceToken);
    await this.handleInitialAndroidNotification();
  };

  async handleInitialAndroidNotification() {
    if (this.initialAndroidNotifHandled) {
      return;
    }
    this.initialAndroidNotifHandled = true;
    const initialNotif =
      await CommAndroidNotifications.getInitialNotification();
    if (initialNotif) {
      await this.androidNotificationOpened(initialNotif);
    }
  }

  registerPushPermissions = (deviceToken: ?string) => {
    const deviceType = Platform.OS;
    if (deviceType !== 'android' && deviceType !== 'ios') {
      return;
    }
    if (deviceType === 'ios') {
      iosPushPermissionResponseReceived();
    }
    if (deviceToken !== this.props.deviceToken) {
      this.setDeviceToken(deviceToken);
    }
  };

  setDeviceToken(deviceToken: ?string) {
    this.props.dispatchActionPromise(
      setDeviceTokenActionTypes,
      this.props.setDeviceToken(deviceToken),
    );
  }

  failedToRegisterPushPermissionsIOS = () => {
    this.setDeviceToken(null);
    if (!this.props.loggedIn) {
      return;
    }
    iosPushPermissionResponseReceived();
  };

  failedToRegisterPushPermissionsAndroid = (
    shouldShowAlertOnAndroid: boolean,
  ) => {
    this.setDeviceToken(null);
    if (!this.props.loggedIn) {
      return;
    }
    if (shouldShowAlertOnAndroid) {
      this.showNotifAlertOnAndroid();
    }
  };

  showNotifAlertOnAndroid() {
    const alertInfo = this.props.notifPermissionAlertInfo;
    if (shouldSkipPushPermissionAlert(alertInfo)) {
      return;
    }
    this.props.dispatch({
      type: recordNotifPermissionAlertActionType,
      payload: { time: Date.now() },
    });

    Alert.alert(
      'Unable to initialize notifs!',
      'Please check your network connection, make sure Google Play ' +
        'services are installed and enabled, and confirm that your Google ' +
        'Play credentials are valid in the Google Play Store.',
      undefined,
      { cancelable: true },
    );
  }

  navigateToThread(threadInfo: ThreadInfo, clearChatRoutes: boolean) {
    if (clearChatRoutes) {
      this.props.navigation.dispatch({
        type: replaceWithThreadActionType,
        payload: { threadInfo },
      });
    } else {
      this.props.navigateToThread({ threadInfo });
    }
  }

  onPressNotificationForThread(threadID: string, clearChatRoutes: boolean) {
    const threadInfo = this.props.threadInfos[threadID];
    if (threadInfo) {
      this.navigateToThread(threadInfo, clearChatRoutes);
    } else {
      this.openThreadOnceReceived.add(threadID);
    }
  }

  saveMessageInfos(messageInfosString: ?string) {
    if (!messageInfosString) {
      return;
    }
    const rawMessageInfos: $ReadOnlyArray<RawMessageInfo> =
      JSON.parse(messageInfosString);
    const { updatesCurrentAsOf } = this.props;
    this.props.dispatch({
      type: saveMessagesActionType,
      payload: { rawMessageInfos, updatesCurrentAsOf },
    });
  }

  iosForegroundNotificationReceived = (
    rawNotification: CoreIOSNotificationData,
  ) => {
    const notification = new CommIOSNotification(rawNotification);
    if (Date.now() < this.appStarted + 1500) {
      // On iOS, when the app is opened from a notif press, for some reason this
      // callback gets triggered before iosNotificationOpened. In fact this
      // callback shouldn't be triggered at all. To avoid weirdness we are
      // ignoring any foreground notification received within the first second
      // of the app being started, since they are most likely to be erroneous.
      notification.finish(
        CommIOSNotifications.getConstants().FETCH_RESULT_NO_DATA,
      );
      return;
    }
    const threadID = notification.getData().threadID;
    const messageInfos = notification.getData().messageInfos;
    this.saveMessageInfos(messageInfos);

    let title = notification.getData().title;
    let body = notification.getData().body;

    if (title && body) {
      ({ title, body } = mergePrefixIntoBody({ title, body }));
    } else {
      body = notification.getMessage();
    }

    if (body) {
      this.showInAppNotification(threadID, body, title);
    } else {
      console.log(
        'Non-rescind foreground notification without alert received!',
      );
    }
    notification.finish(
      CommIOSNotifications.getConstants().FETCH_RESULT_NEW_DATA,
    );
  };

  onPushNotifBootsApp() {
    if (
      this.props.rootContext &&
      this.props.rootContext.detectUnsupervisedBackground
    ) {
      this.props.rootContext.detectUnsupervisedBackground(false);
    }
  }

  iosNotificationOpened = (rawNotification: CoreIOSNotificationData) => {
    const notification = new CommIOSNotification(rawNotification);
    this.onPushNotifBootsApp();
    const threadID = notification.getData().threadID;
    const messageInfos = notification.getData().messageInfos;
    this.saveMessageInfos(messageInfos);
    this.onPressNotificationForThread(threadID, true);
    notification.finish(
      CommIOSNotifications.getConstants().FETCH_RESULT_NEW_DATA,
    );
  };

  showInAppNotification(threadID: string, message: string, title?: ?string) {
    if (threadID === this.props.activeThread) {
      return;
    }
    this.setState({
      inAppNotifProps: {
        customComponent: (
          <InAppNotif
            title={title}
            message={message}
            activeTheme={this.props.activeTheme}
          />
        ),
        blurType: this.props.activeTheme === 'dark' ? 'xlight' : 'dark',
        onPress: () => {
          InAppNotification.hide();
          this.onPressNotificationForThread(threadID, false);
        },
      },
    });
  }

  androidNotificationOpened = async (notificationOpen: AndroidMessage) => {
    this.onPushNotifBootsApp();
    const { threadID } = notificationOpen;
    this.onPressNotificationForThread(threadID, true);
  };

  androidMessageReceived = async (message: AndroidMessage) => {
    this.onPushNotifBootsApp();

    const { messageInfos } = message;
    this.saveMessageInfos(messageInfos);

    handleAndroidMessage(
      message,
      this.props.updatesCurrentAsOf,
      this.handleAndroidNotificationIfActive,
    );
  };

  handleAndroidNotificationIfActive = (
    threadID: string,
    texts: { body: string, title: ?string },
  ) => {
    if (this.currentState !== 'active') {
      return false;
    }
    this.showInAppNotification(threadID, texts.body, texts.title);
    return true;
  };

  render() {
    return (
      <InAppNotification
        {...this.state.inAppNotifProps}
        hideStatusBar={false}
      />
    );
  }
}

const ConnectedPushHandler: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedPushHandler(props: BaseProps) {
    const navContext = React.useContext(NavContext);
    const activeThread = activeMessageListSelector(navContext);
    const boundUnreadCount = useSelector(unreadCount);
    const deviceToken = useSelector(state => state.deviceToken);
    const threadInfos = useSelector(threadInfoSelector);
    const notifPermissionAlertInfo = useSelector(
      state => state.notifPermissionAlertInfo,
    );
    const connection = useSelector(state => state.connection);
    const updatesCurrentAsOf = useSelector(state => state.updatesCurrentAsOf);
    const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
    const loggedIn = useSelector(isLoggedIn);
    const navigateToThread = useNavigateToThread();
    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();
    const boundSetDeviceToken = useServerCall(setDeviceToken);
    const rootContext = React.useContext(RootContext);
    return (
      <PushHandler
        {...props}
        activeThread={activeThread}
        unreadCount={boundUnreadCount}
        deviceToken={deviceToken}
        threadInfos={threadInfos}
        notifPermissionAlertInfo={notifPermissionAlertInfo}
        connection={connection}
        updatesCurrentAsOf={updatesCurrentAsOf}
        activeTheme={activeTheme}
        loggedIn={loggedIn}
        navigateToThread={navigateToThread}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        setDeviceToken={boundSetDeviceToken}
        rootContext={rootContext}
      />
    );
  });

export default ConnectedPushHandler;
