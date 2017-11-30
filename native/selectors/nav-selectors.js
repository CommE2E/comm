// @flow

import type { AppState } from '../redux-setup';
import type { NavigationState } from 'react-navigation/src/TypeDefinition';

import { createSelector } from 'reselect';
import invariant from 'invariant';

import { AppRouteName } from '../navigation-setup';
import { ChatRouteName } from '../chat/chat.react';
import { MessageListRouteName } from '../chat/message-list.react';
import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
} from '../utils/navigation-utils';

const createIsForegroundSelector = (routeName: string) => createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) =>
    navigationState.routes[navigationState.index].routeName === routeName,
);

const createActiveTabSelector = (routeName: string) => createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) => {
    const innerState = navigationState.routes[navigationState.index];
    if (innerState.routeName !== AppRouteName) {
      return false;
    }
    const appRoute = assertNavigationRouteNotLeafNode(innerState);
    return appRoute.routes[appRoute.index].routeName === routeName;
  },
);

const activeThreadSelector = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState): ?string => {
    const innerState = navigationState.routes[navigationState.index];
    if (innerState.routeName !== AppRouteName) {
      return null;
    }
    const appRoute = assertNavigationRouteNotLeafNode(innerState);
    const innerInnerState = appRoute.routes[appRoute.index];
    if (innerInnerState.routeName !== ChatRouteName) {
      return null;
    }
    const chatRoute = assertNavigationRouteNotLeafNode(innerInnerState);
    const innerInnerInnerState = chatRoute.routes[chatRoute.index];
    if (innerInnerInnerState.routeName !== MessageListRouteName) {
      return null;
    }
    return getThreadIDFromParams(innerInnerInnerState);
  },
);

export {
  createIsForegroundSelector,
  createActiveTabSelector,
  activeThreadSelector,
};
