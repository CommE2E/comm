// @flow

import type { BaseAction } from 'lib/types/redux-types';
import type { BaseNavInfo } from 'lib/types/nav-types';
import type { RawThreadInfo, LeaveThreadPayload } from 'lib/types/thread-types';
import type {
  NavigationState,
  NavigationAction,
  NavigationRoute,
  NavigationStateRoute,
} from 'react-navigation';
import type { AppState } from '../redux/redux-setup';
import type { SetSessionPayload } from 'lib/types/session-types';
import type { AndroidNotificationActions } from '../push/reducer';
import type { UserInfo } from 'lib/types/user-types';

import { Alert, Platform } from 'react-native';
import { useScreens } from 'react-native-screens';

import { infoFromURL } from 'lib/utils/url-utils';
import { fifteenDaysEarlier, fifteenDaysLater } from 'lib/utils/date-utils';
import { setNewSessionActionType } from 'lib/utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions';
import {
  leaveThreadActionTypes,
  deleteThreadActionTypes,
  newThreadActionTypes,
} from 'lib/actions/thread-actions';
import { threadInfoFromRawThreadInfo } from 'lib/shared/thread-utils';

import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
  removeScreensFromStack,
} from '../utils/navigation-utils';
import {
  AppRouteName,
  TabNavigatorRouteName,
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
  accountModals,
} from './route-names';
import { handleURLActionType } from '../redux/action-types';
import RootNavigator from './root-navigator.react';

// eslint-disable-next-line react-hooks/rules-of-hooks
useScreens();

export type NavInfo = {|
  ...$Exact<BaseNavInfo>,
  navigationState: NavigationState,
|};

const messageListRouteBase = Date.now();
let messageListRouteIndex = 0;
function getUniqueMessageListRouteKey() {
  return `${messageListRouteBase}-${messageListRouteIndex++}`;
}

export type Action =
  | BaseAction
  | NavigationAction
  | {| type: 'HANDLE_URL', payload: string |}
  | AndroidNotificationActions
  | {| type: 'RECORD_NOTIF_PERMISSION_ALERT', time: number |}
  | {| type: 'BACKGROUND' |}
  | {| type: 'FOREGROUND' |};

const defaultNavigationState = {
  index: 1,
  routes: [
    {
      key: 'App',
      routeName: AppRouteName,
      index: 0,
      routes: [
        {
          key: 'TabNavigator',
          routeName: TabNavigatorRouteName,
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
              routes: [{ key: 'MoreScreen', routeName: MoreScreenRouteName }],
            },
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

function reduceNavInfo(
  state: AppState,
  action: *,
  newThreadInfos: { [id: string]: RawThreadInfo },
): NavInfo {
  let navInfoState = state.navInfo;
  // React Navigation actions
  const navigationState = RootNavigator.router.getStateForAction(
    action,
    navInfoState.navigationState,
  );
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
    action.type === logOutActionTypes.started ||
    action.type === deleteAccountActionTypes.success
  ) {
    return resetNavInfoAndEnsureLoggedOutModalPresence(navInfoState);
  } else if (action.type === setNewSessionActionType) {
    return logOutIfCookieInvalidated(navInfoState, action.payload);
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
  }
  return navInfoState;
}

function handleURL(state: NavigationState, url: string): NavigationState {
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

function resetNavInfoAndEnsureLoggedOutModalPresence(state: NavInfo): NavInfo {
  let navigationState = { ...state.navigationState };
  navigationState.routes[0] = defaultNavInfo.navigationState.routes[0];

  let loggedOutModalFound = false;
  navigationState = removeScreensFromStack(
    navigationState,
    (route: NavigationRoute) => {
      const { routeName } = route;
      if (routeName === LoggedOutModalRouteName) {
        loggedOutModalFound = true;
      }
      return routeName === AppRouteName || accountModals.includes(routeName)
        ? 'keep'
        : 'remove';
    },
  );

  if (!loggedOutModalFound) {
    const [appRoute, ...restRoutes] = navigationState.routes;
    navigationState = {
      ...navigationState,
      index: navigationState.index + 1,
      routes: [
        appRoute,
        { key: 'LoggedOutModal', routeName: LoggedOutModalRouteName },
        ...restRoutes,
      ],
    };
    if (navigationState.index === 1) {
      navigationState = {
        ...navigationState,
        isTransitioning: true,
      };
    }
  }

  return {
    startDate: defaultNavInfo.startDate,
    endDate: defaultNavInfo.endDate,
    navigationState,
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
  if (payload.error === 'client_version_unsupported') {
    const app = Platform.select({
      ios: 'Testflight',
      android: 'Play Store',
    });
    Alert.alert(
      'App out of date',
      "Your app version is pretty old, and the server doesn't know how to " +
        `speak to it anymore. Please use the ${app} app to update!`,
      [{ text: 'OK' }],
    );
  } else {
    Alert.alert(
      'Session invalidated',
      "We're sorry, but your session was invalidated by the server. " +
        'Please log in again.',
      [{ text: 'OK' }],
    );
  }
  return newState;
}

function replaceChatRoute(
  state: NavigationState,
  replaceFunc: (chatRoute: NavigationStateRoute) => NavigationStateRoute,
): NavigationState {
  const appRoute = assertNavigationRouteNotLeafNode(state.routes[0]);
  const tabRoute = assertNavigationRouteNotLeafNode(appRoute.routes[0]);
  const chatRoute = assertNavigationRouteNotLeafNode(tabRoute.routes[1]);

  const newChatRoute = replaceFunc(chatRoute);
  if (newChatRoute === chatRoute) {
    return state;
  }

  const newTabRoutes = [...tabRoute.routes];
  newTabRoutes[1] = newChatRoute;
  const newTabRoute = { ...tabRoute, routes: newTabRoutes };

  const newAppRoutes = [...appRoute.routes];
  newAppRoutes[0] = newTabRoute;
  const newAppRoute = { ...appRoute, routes: newAppRoutes };

  const newRootRoutes = [...state.routes];
  newRootRoutes[0] = newAppRoute;
  return {
    ...state,
    routes: newRootRoutes,
    isTransitioning: true,
  };
}

function popChatScreensForThreadID(
  state: NavigationState,
  actionPayload: LeaveThreadPayload,
): NavigationState {
  const replaceFunc = (chatRoute: NavigationStateRoute) =>
    removeScreensFromStack(chatRoute, (route: NavigationRoute) => {
      if (
        (route.routeName !== MessageListRouteName &&
          route.routeName !== ThreadSettingsRouteName) ||
        (route.routeName === MessageListRouteName &&
          !!actionPayload.threadInfos[actionPayload.threadID])
      ) {
        return 'break';
      }
      const threadID = getThreadIDFromParams(route);
      if (threadID !== actionPayload.threadID) {
        return 'break';
      }
      return 'remove';
    });
  return replaceChatRoute(state, replaceFunc);
}

function filterChatScreensForThreadInfos(
  state: NavigationState,
  threadInfos: { [id: string]: RawThreadInfo },
): NavigationState {
  const replaceFunc = (chatRoute: NavigationStateRoute) =>
    removeScreensFromStack(chatRoute, (route: NavigationRoute) => {
      if (
        route.routeName !== MessageListRouteName &&
        route.routeName !== ThreadSettingsRouteName &&
        route.routeName !== DeleteThreadRouteName
      ) {
        return 'keep';
      }
      const threadID = getThreadIDFromParams(route);
      if (threadID in threadInfos) {
        return 'keep';
      }
      return 'remove';
    });
  return replaceChatRoute(state, replaceFunc);
}

function handleNewThread(
  state: NavigationState,
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: { [id: string]: UserInfo },
): NavigationState {
  const threadInfo = threadInfoFromRawThreadInfo(
    rawThreadInfo,
    viewerID,
    userInfos,
  );
  const replaceFunc = (chatRoute: NavigationStateRoute) => {
    const newChatRoute = removeScreensFromStack(
      chatRoute,
      (route: NavigationRoute) =>
        route.routeName === ComposeThreadRouteName ? 'remove' : 'break',
    );
    const key =
      `${MessageListRouteName}${threadInfo.id}:` +
      getUniqueMessageListRouteKey();
    return {
      ...newChatRoute,
      routes: [
        ...newChatRoute.routes,
        {
          key,
          routeName: MessageListRouteName,
          params: { threadInfo },
        },
      ],
      index: newChatRoute.routes.length,
    };
  };
  return replaceChatRoute(state, replaceFunc);
}

export {
  defaultNavInfo,
  reduceNavInfo,
  replaceChatRoute,
  resetNavInfoAndEnsureLoggedOutModalPresence,
};
