// @flow

import type { AppState } from '../redux/redux-setup';
import type { NavigationState } from 'react-navigation';
import type { CalendarFilter } from 'lib/types/filter-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { GlobalTheme } from '../types/themes';

import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';

import { currentCalendarQuery } from 'lib/selectors/nav-selectors';
import { nonThreadCalendarFiltersSelector } from 'lib/selectors/calendar-filter-selectors';

import {
  AppRouteName,
  TabNavigatorRouteName,
  ThreadSettingsRouteName,
  MessageListRouteName,
  ChatRouteName,
  CalendarRouteName,
  ThreadPickerModalRouteName,
  ActionResultModalRouteName,
  accountModals,
  scrollBlockingChatModals,
  chatRootModals,
} from '../navigation/route-names';
import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
} from '../utils/navigation-utils';

const baseCreateIsForegroundSelector = (routeName: string) =>
  createSelector(
    (state: AppState) => state.navInfo.navigationState,
    (navigationState: NavigationState) =>
      navigationState.routes[navigationState.index].routeName === routeName,
  );
const createIsForegroundSelector: (
  routeName: string,
) => (state: AppState) => boolean = _memoize(baseCreateIsForegroundSelector);

const appLoggedInSelector: (state: AppState) => boolean = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) =>
    !accountModals.includes(
      navigationState.routes[navigationState.index].routeName,
    ),
);

const foregroundKeySelector: (state: AppState) => string = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) =>
    navigationState.routes[navigationState.index].key,
);

const baseCreateActiveTabSelector = (routeName: string) =>
  createSelector(
    (state: AppState) => state.navInfo.navigationState,
    (navigationState: NavigationState) => {
      const currentRootSubroute = navigationState.routes[navigationState.index];
      if (currentRootSubroute.routeName !== AppRouteName) {
        return false;
      }
      const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
      const [firstAppSubroute] = appRoute.routes;
      if (firstAppSubroute.routeName !== TabNavigatorRouteName) {
        return false;
      }
      const tabRoute = assertNavigationRouteNotLeafNode(firstAppSubroute);
      return tabRoute.routes[tabRoute.index].routeName === routeName;
    },
  );
const createActiveTabSelector: (
  routeName: string,
) => (state: AppState) => boolean = _memoize(baseCreateActiveTabSelector);

const scrollBlockingChatModalsClosedSelector: (
  state: AppState,
) => boolean = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) => {
    const currentRootSubroute = navigationState.routes[navigationState.index];
    if (currentRootSubroute.routeName !== AppRouteName) {
      return true;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
    const currentAppSubroute = appRoute.routes[appRoute.index];
    return !scrollBlockingChatModals.includes(currentAppSubroute.routeName);
  },
);

const backgroundIsDarkSelector: (state: AppState) => boolean = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (state: AppState) => state.globalThemeInfo.activeTheme,
  (navigationState: NavigationState, theme: ?GlobalTheme) => {
    const currentRootSubroute = navigationState.routes[navigationState.index];
    if (currentRootSubroute.routeName !== AppRouteName) {
      // Very bright... we'll call it non-dark. Doesn't matter right now since
      // we only use this selector for determining ActionResultModal appearance
      return false;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
    let currentAppSubroute = appRoute.routes[appRoute.index];
    if (currentAppSubroute.routeName === ActionResultModalRouteName) {
      currentAppSubroute = appRoute.routes[appRoute.index - 1];
    }
    if (scrollBlockingChatModals.includes(currentAppSubroute.routeName)) {
      // All the scroll-blocking chat modals have a dark background
      return true;
    }
    return theme === 'dark';
  },
);

const overlayTransitioningSelector: (
  state: AppState,
) => boolean = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState) => {
    const currentRootSubroute = navigationState.routes[navigationState.index];
    if (currentRootSubroute.routeName !== AppRouteName) {
      return false;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
    return !!appRoute.isTransitioning;
  },
);

function activeThread(
  navigationState: NavigationState,
  validRouteNames: $ReadOnlyArray<string>,
): ?string {
  let rootIndex = navigationState.index;
  let currentRootSubroute = navigationState.routes[rootIndex];
  while (currentRootSubroute.routeName !== AppRouteName) {
    if (!chatRootModals.includes(currentRootSubroute.routeName)) {
      return null;
    }
    if (rootIndex === 0) {
      return null;
    }
    currentRootSubroute = navigationState.routes[--rootIndex];
  }
  const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
  const [firstAppSubroute] = appRoute.routes;
  if (firstAppSubroute.routeName !== TabNavigatorRouteName) {
    return null;
  }
  const tabRoute = assertNavigationRouteNotLeafNode(firstAppSubroute);
  const currentTabSubroute = tabRoute.routes[tabRoute.index];
  if (currentTabSubroute.routeName !== ChatRouteName) {
    return null;
  }
  const chatRoute = assertNavigationRouteNotLeafNode(currentTabSubroute);
  const currentChatSubroute = chatRoute.routes[chatRoute.index];
  if (!validRouteNames.includes(currentChatSubroute.routeName)) {
    return null;
  }
  return getThreadIDFromParams(currentChatSubroute);
}

const activeThreadSelector: (state: AppState) => ?string = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState): ?string =>
    activeThread(navigationState, [
      MessageListRouteName,
      ThreadSettingsRouteName,
    ]),
);

const activeMessageListSelector: (state: AppState) => ?string = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState): ?string =>
    activeThread(navigationState, [MessageListRouteName]),
);

const appCanRespondToBackButtonSelector: (
  state: AppState,
) => boolean = createSelector(
  (state: AppState) => state.navInfo.navigationState,
  (navigationState: NavigationState): boolean => {
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
    return (
      currentTabSubroute.index !== null &&
      currentTabSubroute.index !== undefined &&
      currentTabSubroute.index > 0
    );
  },
);

const calendarTabActiveSelector = createActiveTabSelector(CalendarRouteName);
const threadPickerActiveSelector = createIsForegroundSelector(
  ThreadPickerModalRouteName,
);
const calendarActiveSelector: (state: AppState) => boolean = createSelector(
  calendarTabActiveSelector,
  threadPickerActiveSelector,
  (calendarTabActive: boolean, threadPickerActive: boolean) =>
    calendarTabActive || threadPickerActive,
);

const nativeCalendarQuery: (
  state: AppState,
) => () => CalendarQuery = createSelector(
  currentCalendarQuery,
  calendarActiveSelector,
  (
    calendarQuery: (calendarActive: boolean) => CalendarQuery,
    calendarActive: boolean,
  ) => () => calendarQuery(calendarActive),
);

const nonThreadCalendarQuery: (
  state: AppState,
) => () => CalendarQuery = createSelector(
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
  scrollBlockingChatModalsClosedSelector,
  backgroundIsDarkSelector,
  overlayTransitioningSelector,
  activeThreadSelector,
  activeMessageListSelector,
  appCanRespondToBackButtonSelector,
  calendarActiveSelector,
  nativeCalendarQuery,
  nonThreadCalendarQuery,
};
