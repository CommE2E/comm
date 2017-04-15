// @flow

import type { AppState } from './redux-setup';
import type { NavigationState } from 'react-navigation';

import { createSelector } from 'reselect';

const createIsForegroundSelector = (routeName: string) => createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) =>
    navigationState.routes[navigationState.index].routeName === routeName,
);

export {
  createIsForegroundSelector,
};
