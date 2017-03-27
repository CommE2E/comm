// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { UserInfo } from 'lib/types/user-types';
import { PropTypes as ReactNavigationPropTypes } from 'react-navigation';
import type { NavInfo, Action } from './navigation-setup';

import React from 'react';
import invariant from 'invariant';

import baseReducer from 'lib/reducers/master-reducer';

import {
  RootNavigator,
  defaultNavigationState,
  reduceNavInfo,
} from './navigation-setup';

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
  if (action.type === "HANDLE_URL" || action.type === "NAVIGATE_TO_APP") {
    return state;
  }
  return baseReducer(state, action);
}
