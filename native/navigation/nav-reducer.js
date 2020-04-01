// @flow

import type { RawThreadInfo } from 'lib/types/thread-types';
import type {
  NavigationState,
  NavigationRoute,
  NavigationStateRoute,
} from 'react-navigation';
import type { AppState } from '../redux/redux-setup';
import type { SetSessionPayload } from 'lib/types/session-types';
import type { UserInfo } from 'lib/types/user-types';
import type { NavInfo } from './default-state';

import { Alert, Platform } from 'react-native';
import { useScreens } from 'react-native-screens';

import { infoFromURL } from 'lib/utils/url-utils';
import { setNewSessionActionType } from 'lib/utils/action-utils';
import { newThreadActionTypes } from 'lib/actions/thread-actions';
import { threadInfoFromRawThreadInfo } from 'lib/shared/thread-utils';

import {
  assertNavigationRouteNotLeafNode,
  removeScreensFromStack,
} from '../utils/navigation-utils';
import {
  ComposeThreadRouteName,
  MessageListRouteName,
  VerificationModalRouteName,
} from './route-names';
import { handleURLActionType } from '../redux/action-types';
import RootNavigator from './root-navigator.react';

// eslint-disable-next-line react-hooks/rules-of-hooks
useScreens();

const messageListRouteBase = Date.now();
let messageListRouteIndex = 0;
function getUniqueMessageListRouteKey() {
  return `${messageListRouteBase}-${messageListRouteIndex++}`;
}

function reduceNavInfo(state: AppState, action: *): NavInfo {
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

  // Deep linking
  if (action.type === handleURLActionType) {
    return {
      startDate: navInfoState.startDate,
      endDate: navInfoState.endDate,
      navigationState: handleURL(navInfoState.navigationState, action.payload),
    };
  } else if (action.type === setNewSessionActionType) {
    sessionInvalidationAlert(action.payload);
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

function sessionInvalidationAlert(payload: SetSessionPayload) {
  if (!payload.sessionChange.cookieInvalidated) {
    return;
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

export default reduceNavInfo;
