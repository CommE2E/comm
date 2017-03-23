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
import { partialNavInfoFromURL } from 'lib/utils/url-utils';

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

export type Action = BaseAction |
  { type: "HANDLE_URL", payload: string };

function reduceNavInfo(state: NavInfo, action: Action): NavInfo {
  // React Navigation actions
  const navigationState = RootNavigator.router.getStateForAction(
    action,
    state.navigationState,
  )
  if (navigationState && navigationState !== state.navigationState) {
    return { ...state, navigationState };
  }
  // Deep linking
  if (action.type === "HANDLE_URL") {
    // Handle verification links. TODO also handle other URLs
    const partialNavInfo = partialNavInfoFromURL(action.payload);
    if (partialNavInfo.verify) {
      // Special-case behavior if there's already a VerificationModal
      const currentRoute =
        state.navigationState.routes[state.navigationState.index];
      if (currentRoute.key === 'VerificationModal') {
        const newRoute = {
          ...currentRoute,
          params: {
            verifyCode: partialNavInfo.verify,
          },
        };
        const newRoutes = [...state.navigationState.routes];
        newRoutes[state.navigationState.index] = newRoute;
        return {
          ...state,
          navigationState: {
            index: state.navigationState.index,
            routes: newRoutes,
          },
        };
      }
      return {
        ...state,
        navigationState: {
          index: state.navigationState.index + 1,
          routes: [
            ...state.navigationState.routes,
            {
              key: 'VerificationModal',
              routeName: 'VerificationModal',
              params: {
                verifyCode: partialNavInfo.verify,
              },
            },
          ],
        },
      };
    }
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
  if (action.type === "HANDLE_URL") {
    return state;
  }
  return baseReducer(state, action);
}
