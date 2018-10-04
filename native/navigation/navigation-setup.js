// @flow

import type { BaseAction } from 'lib/types/redux-types';
import type { BaseNavInfo } from 'lib/types/nav-types';
import type {
  RawThreadInfo,
  LeaveThreadPayload,
} from 'lib/types/thread-types';
import type {
  NavigationState,
  NavigationScreenProp,
  NavigationAction,
  NavigationRouter,
  NavigationRoute,
  NavigationTransitionProps,
} from 'react-navigation';
import type { AppState } from '../redux-setup';
import type { SetSessionPayload } from 'lib/types/session-types';
import type { NotificationPressPayload } from 'lib/shared/notif-utils';
import type { AndroidNotificationActions } from '../push/android';
import type { UserInfo } from 'lib/types/user-types';

import {
  createBottomTabNavigator,
  createMaterialTopTabNavigator,
  createStackNavigator,
  NavigationActions,
} from 'react-navigation';
import invariant from 'invariant';
import _findIndex from 'lodash/fp/findIndex';
import _includes from 'lodash/fp/includes';
import { Alert, BackHandler, Platform } from 'react-native';
import React from 'react';
import PropTypes from 'prop-types';
import { StackViewTransitionConfigs } from 'react-navigation-stack';

import { infoFromURL } from 'lib/utils/url-utils';
import { fifteenDaysEarlier, fifteenDaysLater } from 'lib/utils/date-utils';
import { setNewSessionActionType } from 'lib/utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
  resetPasswordActionTypes,
} from 'lib/actions/user-actions';
import { pingActionTypes } from 'lib/actions/ping-actions';
import {
  leaveThreadActionTypes,
  deleteThreadActionTypes,
  newThreadActionTypes,
} from 'lib/actions/thread-actions';
import { notificationPressActionType } from 'lib/shared/notif-utils';
import { threadInfoFromRawThreadInfo } from 'lib/shared/thread-utils';
import { connect } from 'lib/utils/redux-utils';

import Calendar from '../calendar/calendar.react';
import Chat from '../chat/chat.react';
import More from '../more/more.react';
import LoggedOutModal from '../account/logged-out-modal.react';
import VerificationModal from '../account/verification-modal.react';
import {
  createIsForegroundSelector,
  appCanRespondToBackButtonSelector,
} from '../selectors/nav-selectors';
import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
} from '../utils/navigation-utils';
import {
  AppRouteName,
  ComposeThreadRouteName,
  DeleteThreadRouteName,
  ThreadSettingsRouteName,
  MessageListRouteName,
  VerificationModalRouteName,
  LoggedOutModalRouteName,
  MoreRouteName,
  MoreScreenRouteName,
  ChatRouteName,
  ChatThreadListRouteName,
  CalendarRouteName,
  ThreadPickerModalRouteName,
} from './route-names';
import {
  handleURLActionType,
  navigateToAppActionType,
} from './action-types';
import ThreadPickerModal from '../calendar/thread-picker-modal.react';

export type NavInfo = {|
  ...$Exact<BaseNavInfo>,
  navigationState: NavigationState,
|};

const uniqueBaseId = `id-${Date.now()}`;
let uuidCount = 0;
function _getUuid() {
  return `${uniqueBaseId}-${uuidCount++}`;
}

export type Action =
  | BaseAction
  | NavigationAction
  | {| type: "HANDLE_URL", payload: string |}
  | {| type: "NAVIGATE_TO_APP", payload: null |}
  | {|
      type: "NOTIFICATION_PRESS",
      payload: NotificationPressPayload,
    |}
  | AndroidNotificationActions
  | {| type: "RECORD_NOTIF_PERMISSION_ALERT", time: number |}
  | {| type: "BACKGROUND" |}
  | {| type: "FOREGROUND" |};

let tabBarOptions;
if (Platform.OS === "android") {
  tabBarOptions = {
    style: {
      backgroundColor: '#445588',
    },
    indicatorStyle: {
      backgroundColor: '#AAFFCC',
    },
  };
} else {
  tabBarOptions = {};
}
const createTabNavigator = Platform.OS === "android"
  ? createMaterialTopTabNavigator
  : createBottomTabNavigator;
const AppNavigator = createTabNavigator(
  {
    [CalendarRouteName]: { screen: Calendar },
    [ChatRouteName]: { screen: Chat },
    [MoreRouteName]: { screen: More },
  },
  {
    initialRouteName: CalendarRouteName,
    lazy: false,
    tabBarOptions,
  },
);
type WrappedAppNavigatorProps = {|
  navigation: NavigationScreenProp<*>,
  isForeground: bool,
  appCanRespondToBackButton: bool,
|};
class WrappedAppNavigator
  extends React.PureComponent<WrappedAppNavigatorProps> {

  static propTypes = {
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    isForeground: PropTypes.bool.isRequired,
    appCanRespondToBackButton: PropTypes.bool.isRequired,
  };

  componentDidMount() {
    if (this.props.isForeground) {
      this.onForeground();
    }
  }

  componentWillUnmount() {
    if (this.props.isForeground) {
      this.onBackground();
    }
  }

  componentWillReceiveProps(nextProps: WrappedAppNavigatorProps) {
    if (!this.props.isForeground && nextProps.isForeground) {
      this.onForeground();
    } else if (this.props.isForeground && !nextProps.isForeground) {
      this.onBackground();
    }
  }

  onForeground() {
    BackHandler.addEventListener('hardwareBackPress', this.hardwareBack);
  }

  onBackground() {
    BackHandler.removeEventListener('hardwareBackPress', this.hardwareBack);
  }

  hardwareBack = () => {
    if (!this.props.appCanRespondToBackButton) {
      return false;
    }
    this.props.navigation.goBack(null);
    return true;
  }

  render() {
    return <AppNavigator navigation={this.props.navigation} />;
  }

}

const isForegroundSelector = createIsForegroundSelector(AppRouteName);
const ReduxWrappedAppNavigator = connect((state: AppState) => ({
  appCanRespondToBackButton: appCanRespondToBackButtonSelector(state),
  isForeground: isForegroundSelector(state),
}))(WrappedAppNavigator);
(ReduxWrappedAppNavigator: Object).router = AppNavigator.router;

const RootNavigator = createStackNavigator(
  {
    [LoggedOutModalRouteName]: { screen: LoggedOutModal },
    [VerificationModalRouteName]: { screen: VerificationModal },
    [AppRouteName]: { screen: ReduxWrappedAppNavigator },
    [ThreadPickerModalRouteName]: { screen: ThreadPickerModal },
  },
  {
    headerMode: 'none',
    mode: 'modal',
    transparentCard: true,
    transitionConfig: (
      transitionProps: NavigationTransitionProps,
      prevTransitionProps: ?NavigationTransitionProps,
      isModal: bool,
    ) => {
      const defaultConfig = StackViewTransitionConfigs.defaultTransitionConfig(
        transitionProps,
        prevTransitionProps,
        isModal,
      );
      return {
        ...defaultConfig,
        screenInterpolator: sceneProps => {
          const { opacity: defaultOpacity, ...defaultInterpolation } =
            defaultConfig.screenInterpolator(sceneProps);
          const { position, scene } = sceneProps;
          const { index, route } = scene;
          if (route.routeName !== ThreadPickerModalRouteName) {
            return defaultInterpolation;
          }
          const opacity = position.interpolate({
            inputRange: [index - 1, index],
            outputRange: [0, 1],
          });
          return { ...defaultInterpolation, opacity };
        },
      };
    },
  },
);

const defaultNavigationState = {
  index: 1,
  routes: [
    {
      key: 'App',
      routeName: AppRouteName,
      index: 1,
      routes: [
        { key: 'Calendar', routeName: CalendarRouteName },
        {
          key: 'Chat',
          routeName: ChatRouteName,
          index: 0,
          routes: [
            { key: 'ChatThreadList', routeName: ChatThreadListRouteName },
          ],
        },
        {
          key: 'More',
          routeName: MoreRouteName,
          index: 0,
          routes: [
            { key: 'MoreScreen', routeName: MoreScreenRouteName },
          ],
        },
      ],
    },
    { key: 'LoggedOutModal', routeName: LoggedOutModalRouteName },
  ],
};

const defaultNavInfo: NavInfo = {
  startDate: fifteenDaysEarlier().valueOf(),
  endDate: fifteenDaysLater().valueOf(),
  navigationState: defaultNavigationState,
};

const accountModals = [ LoggedOutModalRouteName, VerificationModalRouteName ];
function reduceNavInfo(
  state: AppState,
  action: *,
  newThreadInfos: {[id: string]: RawThreadInfo},
): NavInfo {
  let navInfoState = state.navInfo;
  // React Navigation actions
  const navigationState = RootNavigator.router.getStateForAction(
    action,
    navInfoState.navigationState,
  )
  if (navigationState && navigationState !== navInfoState.navigationState) {
    return {
      startDate: navInfoState.startDate,
      endDate: navInfoState.endDate,
      navigationState,
    };
  }

  // Filtering out screens corresponding to deauthorized threads
  const filteredNavigationState = filterChatScreensForThreadInfos(
    navInfoState.navigationState,
    newThreadInfos,
  );
  if (navInfoState.navigationState !== filteredNavigationState) {
    navInfoState = {
      startDate: navInfoState.startDate,
      endDate: navInfoState.endDate,
      navigationState: filteredNavigationState,
    };
  }

  // Deep linking
  if (action.type === handleURLActionType) {
    return {
      startDate: navInfoState.startDate,
      endDate: navInfoState.endDate,
      navigationState: handleURL(navInfoState.navigationState, action.payload),
    };
  } else if (
    action.type === logInActionTypes.success ||
      action.type === registerActionTypes.success ||
      action.type === navigateToAppActionType
  ) {
    return {
      startDate: navInfoState.startDate,
      endDate: navInfoState.endDate,
      navigationState: removeModals(
        navInfoState.navigationState,
        accountModals,
      ),
    };
  } else if (
    action.type === logOutActionTypes.started ||
    action.type === deleteAccountActionTypes.success
  ) {
    return resetNavInfoAndEnsureLoggedOutModalPresence(navInfoState);
  } else if (action.type === setNewSessionActionType) {
    return logOutIfCookieInvalidated(
      navInfoState,
      action.payload,
    );
  } else if (
    action.type === leaveThreadActionTypes.success ||
    action.type === deleteThreadActionTypes.success
  ) {
    return {
      startDate: navInfoState.startDate,
      endDate: navInfoState.endDate,
      navigationState: popChatScreensForThreadID(
        navInfoState.navigationState,
        action.payload,
      ),
    };
  } else if (action.type === newThreadActionTypes.success) {
    return {
      startDate: navInfoState.startDate,
      endDate: navInfoState.endDate,
      navigationState: handleNewThread(
        navInfoState.navigationState,
        action.payload.newThreadInfo,
        state.currentUserInfo && state.currentUserInfo.id,
        state.userInfos,
      ),
    };
  } else if (action.type === notificationPressActionType) {
    return {
      startDate: navInfoState.startDate,
      endDate: navInfoState.endDate,
      navigationState: handleNotificationPress(
        navInfoState.navigationState,
        action.payload,
        state.currentUserInfo && state.currentUserInfo.id,
        state.userInfos,
      ),
    };
  }
  return navInfoState;
}

function handleURL(
  state: NavigationState,
  url: string,
): NavigationState {
  const urlInfo = infoFromURL(url);
  if (!urlInfo.verify) {
    // TODO correctly handle non-verify URLs
    return state;
  }

  // Special-case behavior if there's already a VerificationModal
  const currentRoute = state.routes[state.index];
  if (currentRoute.key === 'VerificationModal') {
    const newRoute = {
      ...currentRoute,
      params: {
        verifyCode: urlInfo.verify,
      },
    };
    const newRoutes = [...state.routes];
    newRoutes[state.index] = newRoute;
    return {
      index: state.index,
      routes: newRoutes,
    };
  }

  return {
    index: state.index + 1,
    routes: [
      ...state.routes,
      {
        key: 'VerificationModal',
        routeName: VerificationModalRouteName,
        params: {
          verifyCode: urlInfo.verify,
        },
      },
    ],
    isTransitioning: true,
  };
}

// This function walks from the back of the stack and calls filterFunc on each
// screen until the stack is exhausted or filterFunc returns "break". A screen
// will be removed if and only if filterFunc returns "remove" (not "break").
function removeScreensFromStack<S: NavigationState>(
  state: S,
  filterFunc: (route: NavigationRoute) => "keep" | "remove" | "break",
): S {
  const newRoutes = [];
  let newIndex = state.index;
  let screenRemoved = false;
  let breakActivated = false;
  for (let i = state.routes.length - 1; i >= 0; i--) {
    const route = state.routes[i];
    if (breakActivated) {
      newRoutes.unshift(route);
      continue;
    }
    const result = filterFunc(route);
    if (result === "break") {
      breakActivated = true;
    }
    if (breakActivated || result === "keep") {
      newRoutes.unshift(route);
      continue;
    }
    screenRemoved = true;
    if (newIndex >= i) {
      invariant(
        newIndex !== 0,
        'Attempting to remove current route and all before it',
      );
      newIndex--;
    }
  }
  if (!screenRemoved) {
    return state;
  }
  return {
    ...state,
    index: newIndex,
    routes: newRoutes,
  };
}

function removeModals(
  state: NavigationState,
  modalRouteNames: string[],
): NavigationState {
  const newState = removeScreensFromStack(
    state,
    (route: NavigationRoute) => _includes(route.routeName)(modalRouteNames)
      ? "remove"
      : "keep",
  );
  if (newState === state) {
    return state;
  }
  return {
    ...newState,
    isTransitioning: true,
  };
}

function resetNavInfoAndEnsureLoggedOutModalPresence(state: NavInfo): NavInfo {
  const navigationState = { ...state.navigationState };
  navigationState.routes[0] = defaultNavInfo.navigationState.routes[0];
  const currentModalIndex =
    _findIndex(['routeName', LoggedOutModalRouteName])(navigationState.routes);
  if (currentModalIndex >= 0 && navigationState.index >= currentModalIndex) {
    return {
      startDate: defaultNavInfo.startDate,
      endDate: defaultNavInfo.endDate,
      navigationState,
    };
  } else if (currentModalIndex >= 0) {
    return {
      startDate: defaultNavInfo.startDate,
      endDate: defaultNavInfo.endDate,
      navigationState: {
        ...navigationState,
        index: currentModalIndex,
        isTransitioning: true,
      },
    };
  }
  return {
    startDate: defaultNavInfo.startDate,
    endDate: defaultNavInfo.endDate,
    navigationState: {
      index: navigationState.routes.length,
      routes: [
        ...navigationState.routes,
        { key: 'LoggedOutModal', routeName: LoggedOutModalRouteName },
      ],
      isTransitioning: true,
    },
  };
}

function logOutIfCookieInvalidated(
  state: NavInfo,
  payload: SetSessionPayload,
): NavInfo {
  if (!payload.sessionChange.cookieInvalidated) {
    return state;
  }
  const newState = resetNavInfoAndEnsureLoggedOutModalPresence(state);
  if (state.navigationState === newState.navigationState) {
    return newState;
  }
  if (payload.error === "client_version_unsupported") {
    const app = Platform.select({
      ios: "Testflight",
      android: "Play Store",
    });
    Alert.alert(
      "App out of date",
      "Your app version is pretty old, and the server doesn't know how to " +
        `speak to it anymore. Please use the ${app} app to update!`,
      [ { text: 'OK' } ],
    );
  } else {
    Alert.alert(
      "Session invalidated",
      "We're sorry, but your session was invalidated by the server. " +
        "Please log in again.",
      [ { text: 'OK' } ],
    );
  }
  return newState;
}

function popChatScreensForThreadID(
  state: NavigationState,
  actionPayload: LeaveThreadPayload,
): NavigationState {
  const appRoute = assertNavigationRouteNotLeafNode(state.routes[0]);
  const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);

  const newChatRoute = removeScreensFromStack(
    chatRoute,
    (route: NavigationRoute) => {
      if (
        (route.routeName !== MessageListRouteName &&
          route.routeName !== ThreadSettingsRouteName) ||
        (route.routeName === MessageListRouteName &&
          !!actionPayload.threadInfos[actionPayload.threadID])
      ) {
        return "break";
      }
      const threadID = getThreadIDFromParams(route);
      if (threadID !== actionPayload.threadID) {
        return "break";
      }
      return "remove";
    },
  );
  if (newChatRoute === chatRoute) {
    return state;
  }

  const newAppSubRoutes = [ ...appRoute.routes ];
  newAppSubRoutes[1] = newChatRoute;
  const newRootSubRoutes = [ ...state.routes ];
  newRootSubRoutes[0] = { ...appRoute, routes: newAppSubRoutes };
  return {
    ...state,
    routes: newRootSubRoutes,
    isTransitioning: true,
  };
}

function filterChatScreensForThreadInfos(
  state: NavigationState,
  threadInfos: {[id: string]: RawThreadInfo},
): NavigationState {
  const appRoute = assertNavigationRouteNotLeafNode(state.routes[0]);
  const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);

  const newChatRoute = removeScreensFromStack(
    chatRoute,
    (route: NavigationRoute) => {
      if (
        route.routeName !== MessageListRouteName &&
        route.routeName !== ThreadSettingsRouteName &&
        route.routeName !== DeleteThreadRouteName
      ) {
        return "keep";
      }
      const threadID = getThreadIDFromParams(route);
      if (threadID in threadInfos) {
        return "keep";
      }
      return "remove";
    },
  );
  if (newChatRoute === chatRoute) {
    return state;
  }

  const newAppSubRoutes = [ ...appRoute.routes ];
  newAppSubRoutes[1] = newChatRoute;
  const newRootSubRoutes = [ ...state.routes ];
  newRootSubRoutes[0] = { ...appRoute, routes: newAppSubRoutes };
  return {
    ...state,
    routes: newRootSubRoutes,
    isTransitioning: true,
  };
}

function handleNewThread(
  state: NavigationState,
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): NavigationState {
  const threadInfo = threadInfoFromRawThreadInfo(
    rawThreadInfo,
    viewerID,
    userInfos,
  );
  const appRoute = assertNavigationRouteNotLeafNode(state.routes[0]);
  const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);

  const newChatRoute = removeScreensFromStack(
    chatRoute,
    (route: NavigationRoute) => route.routeName === ComposeThreadRouteName
      ? "remove"
      : "break",
  );
  newChatRoute.routes.push({
    key: 'NewThreadMessageList',
    routeName: MessageListRouteName,
    params: { threadInfo },
  });
  newChatRoute.index = newChatRoute.routes.length - 1;

  const newAppSubRoutes = [ ...appRoute.routes ];
  newAppSubRoutes[1] = newChatRoute;
  const newRootSubRoutes = [ ...state.routes ];
  newRootSubRoutes[0] = { ...appRoute, routes: newAppSubRoutes };
  return {
    ...state,
    routes: newRootSubRoutes,
    isTransitioning: true,
  };
}

function replaceChatStackWithThread(
  state: NavigationState,
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): NavigationState {
  const threadInfo = threadInfoFromRawThreadInfo(
    rawThreadInfo,
    viewerID,
    userInfos,
  );
  const appRoute = assertNavigationRouteNotLeafNode(state.routes[0]);
  const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);

  const newChatRoute = removeScreensFromStack(
    chatRoute,
    (route: NavigationRoute) => route.routeName === ChatThreadListRouteName
      ? "break"
      : "remove",
  );
  newChatRoute.routes.push({
    key: 'NewThreadMessageList',
    routeName: MessageListRouteName,
    params: { threadInfo },
  });
  newChatRoute.index = 1;

  const newAppSubRoutes = [ ...appRoute.routes ];
  newAppSubRoutes[1] = newChatRoute;
  const newRootSubRoutes = [ ...state.routes ];
  newRootSubRoutes[0] = { ...appRoute, routes: newAppSubRoutes };
  return {
    ...state,
    routes: newRootSubRoutes,
    isTransitioning: true,
  };
}

function handleNotificationPress(
  state: NavigationState,
  payload: NotificationPressPayload,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): NavigationState {
  const appRoute = assertNavigationRouteNotLeafNode(state.routes[0]);
  const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);

  const currentChatRoute = chatRoute.routes[chatRoute.index];
  if (
    currentChatRoute.routeName === MessageListRouteName &&
    getThreadIDFromParams(currentChatRoute) === payload.rawThreadInfo.id &&
    appRoute.index === 1
  ) {
    return state;
  }

  if (payload.clearChatRoutes) {
    const newState = replaceChatStackWithThread(
      state,
      payload.rawThreadInfo,
      viewerID,
      userInfos,
    );
    newState.routes[0] = {
      ...assertNavigationRouteNotLeafNode(newState.routes[0]),
      index: 1,
    };
    return newState;
  }

  const threadInfo = threadInfoFromRawThreadInfo(
    payload.rawThreadInfo,
    viewerID,
    userInfos,
  );
  const newChatRoute = {
    ...chatRoute,
    routes: [
      ...chatRoute.routes,
      {
        key: `Notif-${_getUuid()}`,
        routeName: MessageListRouteName,
        params: { threadInfo },
      }
    ],
    index: chatRoute.routes.length,
  };
  const newAppSubRoutes = [ ...appRoute.routes ];
  newAppSubRoutes[1] = newChatRoute;
  const newRootSubRoutes = [ ...state.routes ];
  newRootSubRoutes[0] = { ...appRoute, routes: newAppSubRoutes, index: 1 };
  return {
    ...state,
    routes: newRootSubRoutes,
    isTransitioning: true,
  };
}

export {
  RootNavigator,
  defaultNavInfo,
  reduceNavInfo,
  removeScreensFromStack,
};
