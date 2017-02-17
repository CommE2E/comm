// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { UserInfo } from 'lib/types/user-types';
import type { BaseNavInfo } from 'lib/types/nav-types';
import type { NavigationState } from 'react-navigation';
import { ReactNavigationPropTypes } from 'react-navigation';

import React from 'react';
import invariant from 'invariant';

import baseReducer from 'lib/reducers/master-reducer';

import { RootNavigator } from './navigation-setup';

export type NavInfo = {
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
};

export type Action = BaseAction<AppState>;

function reduceNavInfo(state: ?NavInfo, action: Action) {
  if (!state) {
    const initialState = {
      index: 1,
      routes: [
        {
          key: 'App',
          routeName: 'App',
          index: 0,
          routes: [
            { key: 'Calendar', routeName: 'Calendar' },
            { key: 'Chat', routeName: 'Chat' },
            { key: 'More', routeName: 'More' },
          ],
        },
        { key: 'LogIn', routeName: 'LogIn' },
      ],
    };
    state = {
      home: true,
      calendarID: null,
      navigationState: initialState,
    };
  }
  const navigationState = RootNavigator.router.getStateForAction(
    action,
    state.navigationState,
  )
  if (navigationState && navigationState !== state.navigationState) {
    return {
      ...state,
      navigationState,
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
