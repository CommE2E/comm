// @flow

import type { AppState } from '../redux-setup';
import type { NavigationState } from 'react-navigation';

import { createSelector } from 'reselect';

import { AppRouteName } from '../navigation-setup';

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

export {
  createIsForegroundSelector,
  createActiveTabSelector,
};
