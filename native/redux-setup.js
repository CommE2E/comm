// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { UserInfo } from 'lib/types/user-types';
import type { BaseNavInfo } from 'lib/types/nav-types';
import type { NavigationState } from './navigation-setup';
import { navigationState } from './navigation-setup';

import React from 'react';
import invariant from 'invariant';

import baseReducer from 'lib/reducers/master-reducer';

import { AppNavigator } from './navigation-setup';

export type NavInfo = {
  home: bool,
  calendarID: ?string,
  navigationState: NavigationState,
};

export const navInfoPropType = React.PropTypes.shape({
  home: React.PropTypes.bool.isRequired,
  calendarID: React.PropTypes.string,
  navigationState: navigationState,
});

export type AppState = {
  navInfo: NavInfo,
  userInfo: ?UserInfo,
  entryInfos: {[id: string]: EntryInfo},
  daysToEntries: {[day: string]: string[]},
  calendarInfos: {[id: string]: CalendarInfo},
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
};

export type Action = BaseAction<AppState>;

function reduceNavInfo(state: ?NavInfo, action: Action) {
  if (!state) {
    invariant(
      action.type === "@@redux/INIT",
      "Redux store should already be initialized",
    );
    return {
      home: true,
      calendarID: null,
      navigationState: AppNavigator.router.getStateForAction(
        action,
        undefined,
      ),
    };
  }
  return state;
}

export function reducer(state: ?AppState, action: Action) {
  const possiblyMutatedState = {
    ...state,
    navInfo: reduceNavInfo(state && state.navInfo, action),
  };
  return baseReducer(possiblyMutatedState, action);
}
