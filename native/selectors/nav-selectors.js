// @flow

import type { AppState } from '../redux-setup';
import type { NavigationState } from 'react-navigation';

import { createSelector } from 'reselect';
import invariant from 'invariant';
import _memoize from 'lodash/memoize';

import {
  AppRouteName,
  ThreadSettingsRouteName,
  MessageListRouteName,
  ChatRouteName,
} from '../navigation/route-names';
import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
} from '../utils/navigation-utils';

const baseCreateIsForegroundSelector = (routeName: string) => createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) =>
    navigationState.routes[navigationState.index].routeName === routeName,
);
const createIsForegroundSelector = _memoize(baseCreateIsForegroundSelector);

const foregroundKeySelector = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) =>
    navigationState.routes[navigationState.index].key,
);

const baseCreateActiveTabSelector = (routeName: string) => createSelector(
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
const createActiveTabSelector = _memoize(baseCreateActiveTabSelector);

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
    if (
      innerInnerInnerState.routeName !== MessageListRouteName &&
      innerInnerInnerState.routeName !== ThreadSettingsRouteName
    ) {
      return null;
    }
    return getThreadIDFromParams(innerInnerInnerState);
  },
);

export {
  createIsForegroundSelector,
  foregroundKeySelector,
  createActiveTabSelector,
  activeThreadSelector,
};
