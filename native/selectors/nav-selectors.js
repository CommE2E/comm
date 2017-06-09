// @flow

import type { AppState } from '../redux-setup';
import type { NavigationState } from 'react-navigation';

import { createSelector } from 'reselect';

import { AppRouteName } from '../navigation-setup';
import { ChatRouteName } from '../chat/chat.react';
import { MessageListRouteName } from '../chat/message-list.react';

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
    return innerState.routes[innerState.index].routeName === routeName;
  },
);

const activeThreadSelector = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState): ?string => {
    const innerState = navigationState.routes[navigationState.index];
    if (innerState.routeName !== AppRouteName) {
      return null;
    }
    const innerInnerState = innerState.routes[innerState.index];
    if (innerInnerState.routeName !== ChatRouteName) {
      return null;
    }
    const innerInnerInnerState = innerInnerState.routes[innerInnerState.index];
    if (innerInnerInnerState.routeName !== MessageListRouteName) {
      return null;
    }
    return innerInnerInnerState.params.threadInfo.id;
  },
);

export {
  createIsForegroundSelector,
  createActiveTabSelector,
  activeThreadSelector,
};
