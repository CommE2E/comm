// @flow

import type { NavContextType } from './navigation-context';
import type { NavigationState } from 'react-navigation';
import type { CalendarFilter } from 'lib/types/filter-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { GlobalTheme } from '../types/themes';
import type { NavPlusRedux } from '../types/selector-types';

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
    (context: ?NavContextType) => context && context.state,
    (navigationState: ?NavigationState) => {
      if (!navigationState) {
        return false;
      }
      return (
        navigationState.routes[navigationState.index].routeName === routeName
      );
    },
  );
const createIsForegroundSelector: (
  routeName: string,
) => (context: ?NavContextType) => boolean = _memoize(
  baseCreateIsForegroundSelector,
);

const appLoggedInSelector: (
  context: ?NavContextType,
) => boolean = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?NavigationState) =>
    !!navigationState &&
    !accountModals.includes(
      navigationState.routes[navigationState.index].routeName,
    ),
);

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
    if (currentRootSubroute.routeName !== AppRouteName) {
      return true;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
    const currentAppSubroute = appRoute.routes[appRoute.index];
    return !scrollBlockingChatModals.includes(currentAppSubroute.routeName);
  },
);

const backgroundIsDarkSelector: (
  input: NavPlusRedux,
) => boolean = createSelector(
  (input: NavPlusRedux) => input.navContext && input.navContext.state,
  (input: NavPlusRedux) => input.redux.globalThemeInfo.activeTheme,
  (navigationState: ?NavigationState, theme: ?GlobalTheme) => {
    if (!navigationState) {
      return false;
    }
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
  context: ?NavContextType,
) => boolean = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?NavigationState) => {
    if (!navigationState) {
      return false;
    }
    const currentRootSubroute = navigationState.routes[navigationState.index];
    if (currentRootSubroute.routeName !== AppRouteName) {
      return false;
    }
    const appRoute = assertNavigationRouteNotLeafNode(currentRootSubroute);
    return !!appRoute.isTransitioning;
  },
);

function activeThread(
  navigationState: ?NavigationState,
  validRouteNames: $ReadOnlyArray<string>,
): ?string {
  if (!navigationState) {
    return null;
  }
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

const activeThreadSelector: (
  context: ?NavContextType,
) => ?string = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?NavigationState): ?string =>
    activeThread(navigationState, [
      MessageListRouteName,
      ThreadSettingsRouteName,
    ]),
);

const activeMessageListSelector: (
  context: ?NavContextType,
) => ?string = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?NavigationState): ?string =>
    activeThread(navigationState, [MessageListRouteName]),
);

const appCanRespondToBackButtonSelector: (
  context: ?NavContextType,
) => boolean = createSelector(
  (context: ?NavContextType) => context && context.state,
  (navigationState: ?NavigationState): boolean => {
    if (!navigationState) {
      return false;
    }
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
