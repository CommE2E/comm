// @flow

import * as Haptics from 'expo-haptics';
import _groupBy from 'lodash/fp/groupBy.js';
import * as React from 'react';
import { LogBox, Platform } from 'react-native';
import { Notification as InAppNotification } from 'react-native-in-app-message';

import { recordAlertActionType } from 'lib/actions/alert-actions.js';
import {
  type DeviceTokens,
  setDeviceTokenActionTypes,
  type SetDeviceTokenStartedPayload,
  type SetDeviceTokenActionPayload,
  useSetDeviceToken,
  useSetDeviceTokenFanout,
} from 'lib/actions/device-actions.js';
import { saveMessagesActionType } from 'lib/actions/message-actions.js';
import { extractKeyserverIDFromIDOptional } from 'lib/keyserver-conn/keyserver-call-utils.js';
import {
  deviceTokensSelector,
  allUpdatesCurrentAsOfSelector,
  allConnectionInfosSelector,
} from 'lib/selectors/keyserver-selectors.js';
import {
  threadInfoSelector,
  thinThreadsUnreadCountSelector,
  unreadThickThreadIDsSelector,
} from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { mergePrefixIntoBody } from 'lib/shared/notif-utils.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import {
  alertTypes,
  type AlertInfo,
  type RecordAlertActionPayload,
} from 'lib/types/alert-types.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import type { ConnectionInfo } from 'lib/types/socket-types.js';
import type { GlobalTheme } from 'lib/types/theme-types.js';
import { shouldSkipPushPermissionAlert } from 'lib/utils/push-alerts.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import sleep from 'lib/utils/sleep.js';

import {
  type AndroidMessage,
  androidNotificationChannelID,
  CommAndroidNotifications,
  getCommAndroidNotificationsEventEmitter,
  handleAndroidMessage,
  parseAndroidMessage,
} from './android.js';
import {
  CommIOSNotification,
  type CoreIOSNotificationData,
  type CoreIOSNotificationDataWithRequestIdentifier,
} from './comm-ios-notification.js';
import InAppNotif from './in-app-notif.react.js';
import {
  CommIOSNotifications,
  type CoreIOSNotificationBackgroundData,
  getCommIOSNotificationsEventEmitter,
  iosPushPermissionResponseReceived,
  requestIOSPushPermissions,
} from './ios.js';
import {
  type MessageListParams,
  useNavigateToThread,
} from '../chat/message-list-types.js';
import {
  addLifecycleListener,
  getCurrentLifecycleState,
} from '../lifecycle/lifecycle.js';
import { commCoreModule } from '../native-modules.js';
import { replaceWithThreadActionType } from '../navigation/action-types.js';
import { activeMessageListSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { RootContext, type RootContextType } from '../root-context.js';
import type { EventSubscription } from '../types/react-native.js';
import Alert from '../utils/alert.js';

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
  +thinThreadsUnreadCount: { +[keyserverID: string]: number },
  +unreadThickThreadIDs: $ReadOnlyArray<string>,
  +connection: { +[keyserverID: string]: ?ConnectionInfo },
  +deviceTokens: {
    +[keyserverID: string]: ?string,
  },
  +threadInfos: {
    +[id: string]: ThreadInfo,
  },
  +notifPermissionAlertInfo: AlertInfo,
  +allUpdatesCurrentAsOf: {
    +[keyserverID: string]: number,
  },
  +activeTheme: ?GlobalTheme,
  +loggedIn: boolean,
  +navigateToThread: (params: MessageListParams) => void,
  // Redux dispatch functions
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +setDeviceToken: (
    input: DeviceTokens,
  ) => Promise<SetDeviceTokenActionPayload>,
  +setDeviceTokenFanout: (
    deviceToken: ?string,
  ) => Promise<SetDeviceTokenActionPayload>,
  // withRootContext
  +rootContext: ?RootContextType,
  +localToken: ?string,
  +tunnelbrokerSocketState:
    | {
        +connected: true,
        +isAuthorized: boolean,
      }
    | {
        +connected: false,
        +retryCount: number,
      },
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
          CommIOSNotifications.getConstants()
            .REMOTE_NOTIFICATIONS_REGISTERED_EVENT,
          registration =>
            this.registerPushPermissions(registration?.deviceToken),
        ),
        commIOSNotificationsEventEmitter.addListener(
          CommIOSNotifications.getConstants()
            .REMOTE_NOTIFICATIONS_REGISTRATION_FAILED_EVENT,
          this.failedToRegisterPushPermissionsIOS,
        ),
        commIOSNotificationsEventEmitter.addListener(
          CommIOSNotifications.getConstants()
            .NOTIFICATION_RECEIVED_FOREGROUND_EVENT,
          this.iosForegroundNotificationReceived,
        ),
        commIOSNotificationsEventEmitter.addListener(
          CommIOSNotifications.getConstants().NOTIFICATION_OPENED_EVENT,
          this.iosNotificationOpened,
        ),
        commIOSNotificationsEventEmitter.addListener(
          CommIOSNotifications.getConstants()
            .NOTIFICATION_RECEIVED_BACKGROUND_EVENT,
          this.iosBackgroundNotificationReceived,
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
          CommAndroidNotifications.getConstants()
            .COMM_ANDROID_NOTIFICATIONS_TOKEN,
          this.handleAndroidDeviceToken,
        ),
        commAndroidNotificationsEventEmitter.addListener(
          CommAndroidNotifications.getConstants()
            .COMM_ANDROID_NOTIFICATIONS_MESSAGE,
          this.androidMessageReceived,
        ),
        commAndroidNotificationsEventEmitter.addListener(
          CommAndroidNotifications.getConstants()
            .COMM_ANDROID_NOTIFICATIONS_NOTIFICATION_OPENED,
          this.androidNotificationOpened,
        ),
      );
    }

    void this.updateBadgeCount();
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
      void this.ensurePushNotifsEnabled();
    } else {
      // We do this in case there was a crash, so we can clear deviceToken from
      // any other cookies it might be set for
      const deviceTokensMap: { [string]: string } = {};
      for (const keyserverID in this.props.deviceTokens) {
        const deviceToken = this.props.deviceTokens[keyserverID];
        if (deviceToken) {
          deviceTokensMap[keyserverID] = deviceToken;
        }
      }
      this.setDeviceToken(deviceTokensMap, { type: 'nothing_to_set' });
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.activeThread !== prevProps.activeThread) {
      this.clearNotifsOfThread();
    }
    void this.updateBadgeCount();

    for (const threadID of this.openThreadOnceReceived) {
      const threadInfo = this.props.threadInfos[threadID];
      if (threadInfo) {
        this.navigateToThread(threadInfo, false);
        this.openThreadOnceReceived.clear();
        break;
      }
    }

    if (this.props.loggedIn && !prevProps.loggedIn) {
      void this.ensurePushNotifsEnabled();
    } else if (!this.props.localToken && prevProps.localToken) {
      void this.ensurePushNotifsEnabled();
    } else {
      for (const keyserverID in this.props.deviceTokens) {
        const deviceToken = this.props.deviceTokens[keyserverID];
        const prevDeviceToken = prevProps.deviceTokens[keyserverID];
        if (!deviceToken && prevDeviceToken) {
          void this.ensurePushNotifsEnabled();
          break;
        }
      }
    }

    if (!this.props.loggedIn && prevProps.loggedIn) {
      this.clearAllNotifs();
      void this.resetBadgeCount();
    }

    if (
      this.state.inAppNotifProps &&
      this.state.inAppNotifProps !== prevState.inAppNotifProps
    ) {
      Haptics.notificationAsync();
      InAppNotification.show();
    }
  }

  async updateBadgeCount() {
    const curThinUnreadCounts = this.props.thinThreadsUnreadCount;
    const curConnections = this.props.connection;

    const currentUnreadThickThreads = this.props.unreadThickThreadIDs;
    const currentTunnelbrokerConnectionStatus =
      this.props.tunnelbrokerSocketState.connected;

    const notifStorageUpdates: Array<{
      +id: string,
      +unreadCount: number,
    }> = [];
    const notifsStorageQueries: Array<string> = [];

    for (const keyserverID in curThinUnreadCounts) {
      if (curConnections[keyserverID]?.status !== 'connected') {
        notifsStorageQueries.push(keyserverID);
        continue;
      }

      notifStorageUpdates.push({
        id: keyserverID,
        unreadCount: curThinUnreadCounts[keyserverID],
      });
    }

    let queriedKeyserverData: $ReadOnlyArray<{
      +id: string,
      +unreadCount: number,
    }> = [];

    const handleUnreadThickThreadIDsInNotifsStorage = (async () => {
      if (currentTunnelbrokerConnectionStatus) {
        await commCoreModule.updateUnreadThickThreadsInNotifsStorage(
          currentUnreadThickThreads,
        );
        return currentUnreadThickThreads;
      }
      return await commCoreModule.getUnreadThickThreadIDsFromNotifsStorage();
    })();

    let unreadThickThreadIDs: $ReadOnlyArray<string>;
    try {
      [queriedKeyserverData, unreadThickThreadIDs] = await Promise.all([
        commCoreModule.getKeyserverDataFromNotifStorage(notifsStorageQueries),
        handleUnreadThickThreadIDsInNotifsStorage,
        commCoreModule.updateKeyserverDataInNotifStorage(notifStorageUpdates),
      ]);
    } catch (e) {
      if (__DEV__) {
        Alert.alert(
          'MMKV error',
          'Failed to update keyserver data in MMKV.' + e.message,
        );
      }
      console.log(e);
      return;
    }

    let totalUnreadCount = 0;
    for (const keyserverData of notifStorageUpdates) {
      totalUnreadCount += keyserverData.unreadCount;
    }
    for (const keyserverData of queriedKeyserverData) {
      totalUnreadCount += keyserverData.unreadCount;
    }

    totalUnreadCount += unreadThickThreadIDs.length;
    if (Platform.OS === 'ios') {
      CommIOSNotifications.setBadgesCount(totalUnreadCount);
    } else if (Platform.OS === 'android') {
      CommAndroidNotifications.setBadge(totalUnreadCount);
    }
  }

  async resetBadgeCount() {
    const keyserversDataToRemove = Object.keys(
      this.props.thinThreadsUnreadCount,
    );
    try {
      await commCoreModule.removeKeyserverDataFromNotifStorage(
        keyserversDataToRemove,
      );
    } catch (e) {
      if (__DEV__) {
        Alert.alert(
          'MMKV error',
          'Failed to remove keyserver from MMKV.' + e.message,
        );
      }
      console.log(e);
      return;
    }

    if (Platform.OS === 'ios') {
      CommIOSNotifications.setBadgesCount(0);
    } else if (Platform.OS === 'android') {
      CommAndroidNotifications.setBadge(0);
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
    if (Platform.OS === 'android') {
      await this.ensureAndroidPushNotifsEnabled();
      return;
    }
    if (Platform.OS !== 'ios') {
      return;
    }
    let missingDeviceToken = !this.props.localToken;
    if (!missingDeviceToken) {
      for (const keyserverID in this.props.deviceTokens) {
        const deviceToken = this.props.deviceTokens[keyserverID];
        if (deviceToken === null || deviceToken === undefined) {
          missingDeviceToken = true;
          break;
        }
      }
    }
    await requestIOSPushPermissions(missingDeviceToken);
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
        return await this.requestAndroidNotificationsPermission();
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

  requestAndroidNotificationsPermission = (): Promise<boolean> => {
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
    const initialNotifThreadID =
      await CommAndroidNotifications.getInitialNotificationThreadID();
    if (initialNotifThreadID) {
      await this.androidNotificationOpened(initialNotifThreadID);
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
    const deviceTokensMap: { [string]: ?string } = {};
    for (const keyserverID in this.props.deviceTokens) {
      const keyserverDeviceToken = this.props.deviceTokens[keyserverID];
      if (deviceToken !== keyserverDeviceToken) {
        deviceTokensMap[keyserverID] = deviceToken;
      }
    }
    this.setDeviceToken(deviceTokensMap, { type: 'device_token', deviceToken });
  };

  setDeviceToken(
    deviceTokens: DeviceTokens,
    payload: SetDeviceTokenStartedPayload,
  ) {
    void this.props.dispatchActionPromise(
      setDeviceTokenActionTypes,
      this.props.setDeviceToken(deviceTokens),
      undefined,
      payload,
    );
  }

  setAllDeviceTokensNull = () => {
    void this.props.dispatchActionPromise(
      setDeviceTokenActionTypes,
      this.props.setDeviceTokenFanout(null),
      undefined,
      { type: 'clear_device_token' },
    );
  };

  failedToRegisterPushPermissionsIOS = () => {
    this.setAllDeviceTokensNull();
    if (!this.props.loggedIn) {
      return;
    }
    iosPushPermissionResponseReceived();
  };

  failedToRegisterPushPermissionsAndroid = (
    shouldShowAlertOnAndroid: boolean,
  ) => {
    this.setAllDeviceTokensNull();
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

    const payload: RecordAlertActionPayload = {
      alertType: alertTypes.NOTIF_PERMISSION,
      time: Date.now(),
    };

    this.props.dispatch({
      type: recordAlertActionType,
      payload,
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

  saveMessageInfos(rawMessageInfos: ?$ReadOnlyArray<RawMessageInfo>) {
    if (!rawMessageInfos) {
      return;
    }

    const keyserverIDToMessageInfos = _groupBy(messageInfos =>
      extractKeyserverIDFromIDOptional(messageInfos.threadID),
    )(rawMessageInfos);

    for (const keyserverID in keyserverIDToMessageInfos) {
      const updatesCurrentAsOf = this.props.allUpdatesCurrentAsOf[keyserverID];
      const messageInfos = keyserverIDToMessageInfos[keyserverID];

      this.props.dispatch({
        type: saveMessagesActionType,
        payload: { rawMessageInfos: messageInfos, updatesCurrentAsOf },
      });
    }
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

  iosBackgroundNotificationReceived = (
    backgroundData: CoreIOSNotificationBackgroundData,
  ) => {
    const convertedMessageInfos = backgroundData.messageInfosArray
      .flatMap(messageInfosString =>
        messageInfosString ? JSON.parse(messageInfosString) : null,
      )
      .filter(Boolean);

    if (!convertedMessageInfos.length) {
      return;
    }

    this.saveMessageInfos(convertedMessageInfos);
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

  androidNotificationOpened = async (threadID: string) => {
    this.onPushNotifBootsApp();
    this.onPressNotificationForThread(threadID, true);
  };

  androidMessageReceived = async (message: AndroidMessage) => {
    const parsedMessage = parseAndroidMessage(message);
    this.onPushNotifBootsApp();

    const { messageInfos } = parsedMessage;
    this.saveMessageInfos(messageInfos);
    handleAndroidMessage(parsedMessage, this.handleAndroidNotificationIfActive);
  };

  handleAndroidNotificationIfActive = (
    threadID: string,
    texts: { body: string, title: ?string },
  ): boolean => {
    if (this.currentState !== 'active') {
      return false;
    }
    this.showInAppNotification(threadID, texts.body, texts.title);
    return true;
  };

  render(): React.Node {
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
    const thinThreadsUnreadCount = useSelector(thinThreadsUnreadCountSelector);
    const unreadThickThreadIDs = useSelector(unreadThickThreadIDsSelector);
    const connection = useSelector(allConnectionInfosSelector);
    const deviceTokens = useSelector(deviceTokensSelector);
    const threadInfos = useSelector(threadInfoSelector);
    const notifPermissionAlertInfo = useSelector(
      state => state.alertStore.alertInfos[alertTypes.NOTIF_PERMISSION],
    );
    const allUpdatesCurrentAsOf = useSelector(allUpdatesCurrentAsOfSelector);
    const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
    const loggedIn = useSelector(isLoggedIn);
    const localToken = useSelector(
      state => state.tunnelbrokerDeviceToken.localToken,
    );
    const navigateToThread = useNavigateToThread();
    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();
    const callSetDeviceToken = useSetDeviceToken();
    const callSetDeviceTokenFanout = useSetDeviceTokenFanout();
    const rootContext = React.useContext(RootContext);
    const { socketState: tunnelbrokerSocketState } = useTunnelbroker();
    return (
      <PushHandler
        {...props}
        activeThread={activeThread}
        thinThreadsUnreadCount={thinThreadsUnreadCount}
        unreadThickThreadIDs={unreadThickThreadIDs}
        connection={connection}
        deviceTokens={deviceTokens}
        threadInfos={threadInfos}
        notifPermissionAlertInfo={notifPermissionAlertInfo}
        allUpdatesCurrentAsOf={allUpdatesCurrentAsOf}
        activeTheme={activeTheme}
        loggedIn={loggedIn}
        navigateToThread={navigateToThread}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        setDeviceToken={callSetDeviceToken}
        setDeviceTokenFanout={callSetDeviceTokenFanout}
        rootContext={rootContext}
        localToken={localToken}
        tunnelbrokerSocketState={tunnelbrokerSocketState}
      />
    );
  });

export default ConnectedPushHandler;
