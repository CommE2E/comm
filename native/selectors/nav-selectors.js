// @flow

import type { AppState } from '../redux-setup';
import type { NavigationState } from 'react-navigation/src/TypeDefinition';

import { createSelector } from 'reselect';
import invariant from 'invariant';

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
    // We know that if the routeName is AppRouteName, then the NavigationRoute
    // is a NavigationStateRoute
    invariant(
      innerState.routes &&
        Array.isArray(innerState.routes) &&
        innerState.index &&
        typeof innerState.index === "number" &&
        innerState.routes[innerState.index] &&
        innerState.routes[innerState.index].routeName &&
        typeof innerState.routes[innerState.index].routeName === "string",
      "route with AppRouteName should be NavigationStateRoute",
    );
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
    // We know that if the routeName is AppRouteName, then the NavigationRoute
    // is a NavigationStateRoute
    invariant(
      innerState.routes &&
        Array.isArray(innerState.routes) &&
        innerState.index &&
        typeof innerState.index === "number" &&
        innerState.routes[innerState.index] &&
        innerState.routes[innerState.index].routeName &&
        typeof innerState.routes[innerState.index].routeName === "string",
      "route with AppRouteName should be NavigationStateRoute",
    );
    const innerInnerState = innerState.routes[innerState.index];
    if (innerInnerState.routeName !== ChatRouteName) {
      return null;
    }
    // We know that if the routeName is ChatRouteName, then the NavigationRoute
    // is a NavigationStateRoute
    invariant(
      innerInnerState.routes &&
        Array.isArray(innerInnerState.routes) &&
        innerInnerState.index &&
        typeof innerInnerState.index === "number" &&
        innerInnerState.routes[innerInnerState.index] &&
        innerInnerState.routes[innerInnerState.index].routeName &&
        typeof innerInnerState.routes[innerInnerState.index].routeName
          === "string",
      "route with ChatRouteName should be NavigationStateRoute",
    );
    const innerInnerInnerState = innerInnerState.routes[innerInnerState.index];
    if (innerInnerInnerState.routeName !== MessageListRouteName) {
      return null;
    }
    // We know that if the routeName is MessageListRouteName, then the
    // NavigationRoute is a NavigationLeafRoute
    invariant(
      innerInnerInnerState.params &&
        innerInnerInnerState.params.threadInfo &&
        typeof innerInnerInnerState.params.threadInfo === "object" &&
        innerInnerInnerState.params.threadInfo.id &&
        typeof innerInnerInnerState.params.threadInfo.id === "string",
      "there's no way in react-navigation/Flow to type this",
    );
    return innerInnerInnerState.params.threadInfo.id;
  },
);

export {
  createIsForegroundSelector,
  createActiveTabSelector,
  activeThreadSelector,
};
