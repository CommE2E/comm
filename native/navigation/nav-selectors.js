// @flow

import type { PossiblyStaleNavigationState } from '@react-navigation/native';
import _memoize from 'lodash/memoize';
import * as React from 'react';
import { createSelector } from 'reselect';

import { nonThreadCalendarFiltersSelector } from 'lib/selectors/calendar-filter-selectors';
import { currentCalendarQuery } from 'lib/selectors/nav-selectors';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { CalendarFilter } from 'lib/types/filter-types';

import { useSelector } from '../redux/redux-utils';
import type { NavPlusRedux } from '../types/selector-types';
import type { GlobalTheme } from '../types/themes';
import type { NavContextType } from './navigation-context';
import { NavContext } from './navigation-context';
import {
  getStateFromNavigatorRoute,
  getThreadIDFromRoute,
} from './navigation-utils';
import {
  AppRouteName,
  TabNavigatorRouteName,
  MessageListRouteName,
  ChatRouteName,
  CalendarRouteName,
  ThreadPickerModalRouteName,
  ActionResultModalRouteName,
  accountModals,
  scrollBlockingModals,
  chatRootModals,
  threadRoutes,
} from './route-names';

const baseCreateIsForegroundSelector = (routeName: string) =>
  createSelector(
    (context: ?NavContextType) => context && context.state,
    (navigationState: ?PossiblyStaleNavigationState) => {
      if (!navigationState) {
        return false;
      }
      return navigationState.routes[navigationState.index].name === routeName;
    },
  );
const createIsForegroundSelector: (
  routeName: string,
) => (context: ?NavContextType) => boolean = _memoize(
  baseCreateIsForegroundSelector,
);

function useIsAppLoggedIn(): boolean {
  const navContext = React.useContext(NavContext);
  return React.useMemo(() => {
    if (!navContext) {
      return false;
    }
    const { state } = navContext;
    return !accountModals.includes(state.routes[state.index].name);
  }, [navContext]);
}

const baseCreateActiveTabSelector = (routeName: string) =>
  createSelector(
    (context: ?NavContextType) => context && context.state,
    (navigationState: ?PossiblyStaleNavigationState) => {
      if (!navigationState) {
        return false;
      }
      const currentRootSubroute = navigationState.routes[navigationState.index];
      if (currentRootSubroute.name !== AppRouteName) {
        return false;
      }
      const appState = getStateFromNavigatorRoute(currentRootSubroute);
      const [firstAppSubroute] = appState.routes;
      if (firstAppSubroute.name !== TabNavigatorRouteName) {
        return false;
      }
      const tabState = getStateFromNavigatorRoute(firstAppSubroute);
      return tabState.routes[tabState.index].name === routeName;
    },
  );
const createActiveTabSelector: (
  routeName: string,
) => (context: ?NavContextType) => boolean = _memoize(
  baseCreateActiveTabSelector,
);

const scrollBlockingModalsClosedSelector: (
  context: ?NavContextType,
) => boolean = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?PossiblyStaleNavigationState) => {
    if (!navigationState) {
      return false;
    }
    const currentRootSubroute = navigationState.routes[navigationState.index];
    if (currentRootSubroute.name !== AppRouteName) {
      return true;
    }
    const appState = getStateFromNavigatorRoute(currentRootSubroute);
    for (let i = appState.index; i >= 0; i--) {
      const route = appState.routes[i];
      if (scrollBlockingModals.includes(route.name)) {
        return false;
      }
    }
    return true;
  },
);

function selectBackgroundIsDark(
  navigationState: ?PossiblyStaleNavigationState,
  theme: ?GlobalTheme,
): boolean {
  if (!navigationState) {
    return false;
  }
  const currentRootSubroute = navigationState.routes[navigationState.index];
  if (currentRootSubroute.name !== AppRouteName) {
    // Very bright... we'll call it non-dark. Doesn't matter right now since
    // we only use this selector for determining ActionResultModal appearance
    return false;
  }
  const appState = getStateFromNavigatorRoute(currentRootSubroute);
  let appIndex = appState.index;
  let currentAppSubroute = appState.routes[appIndex];
  while (currentAppSubroute.name === ActionResultModalRouteName) {
    currentAppSubroute = appState.routes[--appIndex];
  }
  if (scrollBlockingModals.includes(currentAppSubroute.name)) {
    // All the scroll-blocking chat modals have a dark background
    return true;
  }
  return theme === 'dark';
}

function activeThread(
  navigationState: ?PossiblyStaleNavigationState,
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
  const appState = getStateFromNavigatorRoute(currentRootSubroute);
  const [firstAppSubroute] = appState.routes;
  if (firstAppSubroute.name !== TabNavigatorRouteName) {
    return null;
  }
  const tabState = getStateFromNavigatorRoute(firstAppSubroute);
  const currentTabSubroute = tabState.routes[tabState.index];
  if (currentTabSubroute.name !== ChatRouteName) {
    return null;
  }
  const chatState = getStateFromNavigatorRoute(currentTabSubroute);
  const currentChatSubroute = chatState.routes[chatState.index];
  return getThreadIDFromRoute(currentChatSubroute, validRouteNames);
}

const activeThreadSelector: (
  context: ?NavContextType,
) => ?string = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?PossiblyStaleNavigationState): ?string =>
    activeThread(navigationState, threadRoutes),
);

const messageListRouteNames = [MessageListRouteName];
const activeMessageListSelector: (
  context: ?NavContextType,
) => ?string = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?PossiblyStaleNavigationState): ?string =>
    activeThread(navigationState, messageListRouteNames),
);

function useActiveThread(): ?string {
  const navContext = React.useContext(NavContext);
  return React.useMemo(() => {
    if (!navContext) {
      return null;
    }
    const { state } = navContext;
    return activeThread(state, threadRoutes);
  }, [navContext]);
}

function useActiveMessageList(): ?string {
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

function useCalendarQuery(): () => CalendarQuery {
  const navContext = React.useContext(NavContext);
  return useSelector(state =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );
}

export {
  createIsForegroundSelector,
  useIsAppLoggedIn,
  createActiveTabSelector,
  scrollBlockingModalsClosedSelector,
  selectBackgroundIsDark,
  activeThreadSelector,
  activeMessageListSelector,
  useActiveThread,
  useActiveMessageList,
  calendarActiveSelector,
  nativeCalendarQuery,
  nonThreadCalendarQuery,
  useCalendarQuery,
};
