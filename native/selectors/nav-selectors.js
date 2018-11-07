// @flow

import type { AppState } from '../redux-setup';
import type { NavigationState } from 'react-navigation';
import type { CalendarFilter } from 'lib/types/filter-types';
import type { CalendarQuery } from 'lib/types/entry-types';

import { createSelector } from 'reselect';
import invariant from 'invariant';
import _memoize from 'lodash/memoize';

import { currentCalendarQuery } from 'lib/selectors/nav-selectors';
import {
  nonThreadCalendarFiltersSelector,
} from 'lib/selectors/calendar-filter-selectors';

import {
  AppRouteName,
  ThreadSettingsRouteName,
  MessageListRouteName,
  ChatRouteName,
  CalendarRouteName,
  ThreadPickerModalRouteName,
  accountModals,
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

const appLoggedInSelector = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) => !accountModals.includes(
    navigationState.routes[navigationState.index].routeName,
  ),
);

const foregroundKeySelector = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) =>
    navigationState.routes[navigationState.index].key,
);

const baseCreateActiveTabSelector = (routeName: string) => createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) => {
    const currentRoute = navigationState.routes[navigationState.index];
    if (currentRoute.routeName !== AppRouteName) {
      return false;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRoute);
    return appRoute.routes[appRoute.index].routeName === routeName;
  },
);
const createActiveTabSelector = _memoize(baseCreateActiveTabSelector);

const activeThreadSelector = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState): ?string => {
    const currentRoute = navigationState.routes[navigationState.index];
    if (currentRoute.routeName !== AppRouteName) {
      return null;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRoute);
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

const appCanRespondToBackButtonSelector = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState): bool => {
    const currentRoute = navigationState.routes[navigationState.index];
    if (currentRoute.routeName !== AppRouteName) {
      return false;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRoute);
    const currentTabRoute = appRoute.routes[appRoute.index];
    return currentTabRoute.index !== null
      && currentTabRoute.index !== undefined
      && currentTabRoute.index > 0;
  },
);

const calendarTabActiveSelector = createActiveTabSelector(CalendarRouteName);
const threadPickerActiveSelector =
  createIsForegroundSelector(ThreadPickerModalRouteName);
const calendarActiveSelector = createSelector(
  calendarTabActiveSelector,
  threadPickerActiveSelector,
  (calendarTabActive: bool, threadPickerActive: bool) =>
    calendarTabActive || threadPickerActive,
);

const nativeCalendarQuery = createSelector(
  currentCalendarQuery,
  calendarActiveSelector,
  (
    calendarQuery: (calendarActive: bool) => CalendarQuery,
    calendarActive: bool,
  ) => () => calendarQuery(calendarActive),
);

const nonThreadCalendarQuery = createSelector(
  nativeCalendarQuery,
  nonThreadCalendarFiltersSelector,
  (
    calendarQuery: () => CalendarQuery,
    filters: $ReadOnlyArray<CalendarFilter>,
  ) => {
    return (): CalendarQuery => {
      const query = calendarQuery();
      return {
        startDate: query.startDate,
        endDate: query.endDate,
        filters,
      };
    };
  },
);

export {
  createIsForegroundSelector,
  appLoggedInSelector,
  foregroundKeySelector,
  createActiveTabSelector,
  activeThreadSelector,
  appCanRespondToBackButtonSelector,
  calendarActiveSelector,
  nativeCalendarQuery,
  nonThreadCalendarQuery,
};
