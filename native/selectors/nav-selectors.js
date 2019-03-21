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
  TabNavigatorRouteName,
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

const baseCreateIsForegroundSelector =
  (routeName: string) => createSelector<*, *, *, *>(
    (state: AppState) => state.navInfo.navigationState,
    (navigationState: NavigationState) =>
      navigationState.routes[navigationState.index].routeName === routeName,
  );
const createIsForegroundSelector =
  _memoize<*, *>(baseCreateIsForegroundSelector);

const appLoggedInSelector = createSelector<*, *, *, *>(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) => !accountModals.includes(
    navigationState.routes[navigationState.index].routeName,
  ),
);

const foregroundKeySelector = createSelector<*, *, *, *>(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) =>
    navigationState.routes[navigationState.index].key,
);

const baseCreateActiveTabSelector =
  (routeName: string) => createSelector<*, *, *, *>(
    (state: AppState) => state.navInfo.navigationState,
    (navigationState: NavigationState) => {
      const currentRootSubroute = navigationState.routes[navigationState.index];
      if (currentRootSubroute.routeName !== AppRouteName) {
        return false;
      }
      const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
      const currentAppSubroute = appRoute.routes[appRoute.index];
      if (currentAppSubroute.routeName !== TabNavigatorRouteName) {
        return false;
      }
      const tabRoute = assertNavigationRouteNotLeafNode(currentAppSubroute);
      return tabRoute.routes[tabRoute.index].routeName === routeName;
    },
  );
const createActiveTabSelector = _memoize<*, *>(baseCreateActiveTabSelector);

const activeThreadSelector = createSelector<*, *, *, *>(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState): ?string => {
    const currentRootSubroute = navigationState.routes[navigationState.index];
    if (currentRootSubroute.routeName !== AppRouteName) {
      return null;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
    const currentAppSubroute = appRoute.routes[appRoute.index];
    if (currentAppSubroute.routeName !== TabNavigatorRouteName) {
      return null;
    }
    const tabRoute = assertNavigationRouteNotLeafNode(currentAppSubroute);
    const currentTabSubroute = tabRoute.routes[tabRoute.index];
    if (currentTabSubroute.routeName !== ChatRouteName) {
      return null;
    }
    const chatRoute = assertNavigationRouteNotLeafNode(currentTabSubroute);
    const currentChatSubroute = chatRoute.routes[chatRoute.index];
    if (
      currentChatSubroute.routeName !== MessageListRouteName &&
      currentChatSubroute.routeName !== ThreadSettingsRouteName
    ) {
      return null;
    }
    return getThreadIDFromParams(currentChatSubroute);
  },
);

const appCanRespondToBackButtonSelector = createSelector<*, *, *, *>(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState): bool => {
    const currentRootSubroute = navigationState.routes[navigationState.index];
    if (currentRootSubroute.routeName !== AppRouteName) {
      return false;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
    const currentAppSubroute = appRoute.routes[appRoute.index];
    if (currentAppSubroute.routeName !== TabNavigatorRouteName) {
      return true;
    }
    const tabRoute = assertNavigationRouteNotLeafNode(currentAppSubroute);
    const currentTabSubroute = tabRoute.routes[tabRoute.index];
    return currentTabSubroute.index !== null
      && currentTabSubroute.index !== undefined
      && currentTabSubroute.index > 0;
  },
);

const calendarTabActiveSelector = createActiveTabSelector(CalendarRouteName);
const threadPickerActiveSelector =
  createIsForegroundSelector(ThreadPickerModalRouteName);
const calendarActiveSelector = createSelector<*, *, *, *, *>(
  calendarTabActiveSelector,
  threadPickerActiveSelector,
  (calendarTabActive: bool, threadPickerActive: bool) =>
    calendarTabActive || threadPickerActive,
);

const nativeCalendarQuery = createSelector<*, *, *, *, *>(
  currentCalendarQuery,
  calendarActiveSelector,
  (
    calendarQuery: (calendarActive: bool) => CalendarQuery,
    calendarActive: bool,
  ) => () => calendarQuery(calendarActive),
);

const nonThreadCalendarQuery = createSelector<*, *, *, *, *>(
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
