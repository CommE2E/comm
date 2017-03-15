// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { UserInfo } from 'lib/types/user-types';
import type { BaseNavInfo } from 'lib/types/nav-types';
import type { NavigationState } from 'react-navigation';
import { PropTypes as ReactNavigationPropTypes } from 'react-navigation';

import React from 'react';
import invariant from 'invariant';

import baseReducer from 'lib/reducers/master-reducer';

import { RootNavigator, defaultNavigationState } from './navigation-setup';

export type NavInfo = BaseNavInfo & {
  home: bool,
  calendarID: ?string,
  navigationState: NavigationState,
};

export const navInfoPropType = React.PropTypes.shape({
  home: React.PropTypes.bool.isRequired,
  calendarID: React.PropTypes.string,
  navigationState: ReactNavigationPropTypes.navigationState,
});

export type AppState = {
  navInfo: NavInfo,
  userInfo: ?UserInfo,
  entryInfos: {[id: string]: EntryInfo},
  daysToEntries: {[day: string]: string[]},
  calendarInfos: {[id: string]: CalendarInfo},
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
};

export type Action = BaseAction<AppState>;

function reduceNavInfo(state: NavInfo, action: Action): NavInfo {
  const navigationState = RootNavigator.router.getStateForAction(
    action,
    state.navigationState,
  )
  if (navigationState && navigationState !== state.navigationState) {
    return { ...state, navigationState };
  }
  return state;
}

export const defaultState = ({
  navInfo: {
    home: true,
    calendarID: null,
    navigationState: defaultNavigationState,
  },
  userInfo: null,
  entryInfos: {},
  daysToEntries: {},
  calendarInfos: {},
  loadingStatuses: {},
  cookie: null,
}: AppState);

export function reducer(state: AppState, action: Action) {
  const navInfo = reduceNavInfo(state && state.navInfo, action);
  if (navInfo && navInfo !== state.navInfo) {
    state = { ...state, navInfo };
  }
  return baseReducer(state, action);
}
