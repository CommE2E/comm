// @flow

import type { NavContextType } from './navigation-context';
import type { NavigationState } from 'react-navigation';
import type { CalendarFilter } from 'lib/types/filter-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { GlobalTheme } from '../types/themes';
import type { NavPlusRedux } from '../types/selector-types';

import * as React from 'react';
import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';

import { currentCalendarQuery } from 'lib/selectors/nav-selectors';
import { nonThreadCalendarFiltersSelector } from 'lib/selectors/calendar-filter-selectors';

import {
  AppRouteName,
  TabNavigatorRouteName,
  MessageListRouteName,
  ChatRouteName,
  CalendarRouteName,
  ThreadPickerModalRouteName,
  ActionResultModalRouteName,
  accountModals,
  scrollBlockingChatModals,
  chatRootModals,
  threadRoutes,
} from './route-names';
import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromRoute,
} from '../utils/navigation-utils';
import { NavContext } from './navigation-context';

const baseCreateIsForegroundSelector = (routeName: string) =>
  createSelector(
    (context: ?NavContextType) => context && context.state,
    (navigationState: ?NavigationState) => {
      if (!navigationState) {
        return false;
      }
      return (
        navigationState.routes[navigationState.index].name === routeName
      );
    },
  );
const createIsForegroundSelector: (
  routeName: string,
) => (context: ?NavContextType) => boolean = _memoize(
  baseCreateIsForegroundSelector,
);

function useIsAppLoggedIn() {
  const navContext = React.useContext(NavContext);
  return React.useMemo(() => {
    if (!navContext) {
      return false;
    }
    const { state } = navContext;
    return !accountModals.includes(state.routes[state.index].name);
  }, [navContext]);
}

const foregroundKeySelector: (
  context: ?NavContextType,
) => ?string = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?NavigationState) =>
    navigationState && navigationState.routes[navigationState.index].key,
);

const baseCreateActiveTabSelector = (routeName: string) =>
  createSelector(
    (context: ?NavContextType) => context && context.state,
    (navigationState: ?NavigationState) => {
      if (!navigationState) {
        return false;
      }
      const currentRootSubroute = navigationState.routes[navigationState.index];
      if (currentRootSubroute.name !== AppRouteName) {
        return false;
      }
      const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
      const [firstAppSubroute] = appRoute.state.routes;
      if (firstAppSubroute.name !== TabNavigatorRouteName) {
        return false;
      }
      const tabRoute = assertNavigationRouteNotLeafNode(firstAppSubroute);
      return tabRoute.state.routes[tabRoute.state.index].name === routeName;
    },
  );
const createActiveTabSelector: (
  routeName: string,
) => (context: ?NavContextType) => boolean = _memoize(
  baseCreateActiveTabSelector,
);

const scrollBlockingChatModalsClosedSelector: (
  context: ?NavContextType,
) => boolean = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?NavigationState) => {
    if (!navigationState) {
      return false;
    }
    const currentRootSubroute = navigationState.routes[navigationState.index];
    if (currentRootSubroute.name !== AppRouteName) {
      return true;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
    for (let i = appRoute.state.index; i >= 0; i--) {
      const route = appRoute.state.routes[i];
      if (scrollBlockingChatModals.includes(route.name)) {
        return false;
      }
    }
    return true;
  },
);

function selectBackgroundIsDark(
  navigationState: ?NavigationState,
  theme: ?GlobalTheme,
) {
  if (!navigationState) {
    return false;
  }
  const currentRootSubroute = navigationState.routes[navigationState.index];
  if (currentRootSubroute.name !== AppRouteName) {
    // Very bright... we'll call it non-dark. Doesn't matter right now since
    // we only use this selector for determining ActionResultModal appearance
    return false;
  }
  const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
  let appIndex = appRoute.state.index;
  let currentAppSubroute = appRoute.state.routes[appIndex];
  while (currentAppSubroute.name === ActionResultModalRouteName) {
    currentAppSubroute = appRoute.state.routes[--appIndex];
  }
  if (scrollBlockingChatModals.includes(currentAppSubroute.name)) {
    // All the scroll-blocking chat modals have a dark background
    return true;
  }
  return theme === 'dark';
}

function activeThread(
  navigationState: ?NavigationState,
  validRouteNames: $ReadOnlyArray<string>,
): ?string {
  if (!navigationState) {
    return null;
  }
  let rootIndex = navigationState.index;
  let currentRootSubroute = navigationState.routes[rootIndex];
  while (currentRootSubroute.name !== AppRouteName) {
    if (!chatRootModals.includes(currentRootSubroute.name)) {
      return null;
    }
    if (rootIndex === 0) {
      return null;
    }
    currentRootSubroute = navigationState.routes[--rootIndex];
  }
  const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
  const [firstAppSubroute] = appRoute.state.routes;
  if (firstAppSubroute.name !== TabNavigatorRouteName) {
    return null;
  }
  const tabRoute = assertNavigationRouteNotLeafNode(firstAppSubroute);
  const currentTabSubroute = tabRoute.state.routes[tabRoute.state.index];
  if (currentTabSubroute.name !== ChatRouteName) {
    return null;
  }
  const chatRoute = assertNavigationRouteNotLeafNode(currentTabSubroute);
  const currentChatSubroute = chatRoute.state.routes[chatRoute.state.index];
  return getThreadIDFromRoute(currentChatSubroute, validRouteNames);
}

const activeThreadSelector: (
  context: ?NavContextType,
) => ?string = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?NavigationState): ?string =>
    activeThread(navigationState, threadRoutes),
);

const messageListRouteNames = [MessageListRouteName];
const activeMessageListSelector: (
  context: ?NavContextType,
) => ?string = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?NavigationState): ?string =>
    activeThread(navigationState, messageListRouteNames),
);

function useActiveThread() {
  const navContext = React.useContext(NavContext);
  return React.useMemo(() => {
    if (!navContext) {
      return null;
    }
    const { state } = navContext;
    return activeThread(state, threadRoutes);
  }, [navContext]);
}

function useActiveMessageList() {
  const navContext = React.useContext(NavContext);
  return React.useMemo(() => {
    if (!navContext) {
      return null;
    }
    const { state } = navContext;
    return activeThread(state, messageListRouteNames);
  }, [navContext]);
}

const calendarTabActiveSelector = createActiveTabSelector(CalendarRouteName);
const threadPickerActiveSelector = createIsForegroundSelector(
  ThreadPickerModalRouteName,
);
const calendarActiveSelector: (
  context: ?NavContextType,
) => boolean = createSelector(
  calendarTabActiveSelector,
  threadPickerActiveSelector,
  (calendarTabActive: boolean, threadPickerActive: boolean) =>
    calendarTabActive || threadPickerActive,
);

const nativeCalendarQuery: (
  input: NavPlusRedux,
) => () => CalendarQuery = createSelector(
  (input: NavPlusRedux) => currentCalendarQuery(input.redux),
  (input: NavPlusRedux) => calendarActiveSelector(input.navContext),
  (
    calendarQuery: (calendarActive: boolean) => CalendarQuery,
    calendarActive: boolean,
  ) => () => calendarQuery(calendarActive),
);

const nonThreadCalendarQuery: (
  input: NavPlusRedux,
) => () => CalendarQuery = createSelector(
  nativeCalendarQuery,
  (input: NavPlusRedux) => nonThreadCalendarFiltersSelector(input.redux),
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
  useIsAppLoggedIn,
  foregroundKeySelector,
  createActiveTabSelector,
  scrollBlockingChatModalsClosedSelector,
  selectBackgroundIsDark,
  activeThreadSelector,
  activeMessageListSelector,
  useActiveThread,
  useActiveMessageList,
  calendarActiveSelector,
  nativeCalendarQuery,
  nonThreadCalendarQuery,
};
