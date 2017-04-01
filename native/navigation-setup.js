// @flow

import type { BaseAction } from 'lib/types/redux-types';
import type { BaseNavInfo } from 'lib/types/nav-types';
import type { CalendarInfo } from 'lib/types/calendar-types';
import type { NavigationState } from 'react-navigation';

import { TabNavigator, StackNavigator } from 'react-navigation';
import invariant from 'invariant';
import _findIndex from 'lodash/fp/findIndex';
import { Alert } from 'react-native';

import { partialNavInfoFromURL } from 'lib/utils/url-utils';

import Calendar from './calendar/calendar.react';
import Chat from './chat/chat.react';
import More from './more/more.react';
import LoggedOutModal from './account/logged-out-modal.react';
import VerificationModal from './account/verification-modal.react';

export type NavInfo = BaseNavInfo & {
  home: bool,
  calendarID: ?string,
  navigationState: NavigationState,
};

export type Action = BaseAction |
  { type: "HANDLE_URL", payload: string } |
  { type: "NAVIGATE_TO_APP", payload: null };

const AppNavigator = TabNavigator(
  {
    Calendar: { screen: Calendar },
    Chat: { screen: Chat },
    More: { screen: More },
  },
  {
    initialRouteName: 'Calendar',
  },
);

const RootNavigator = StackNavigator(
  {
    LoggedOutModal: { screen: LoggedOutModal },
    VerificationModal: { screen: VerificationModal },
    App: { screen: AppNavigator },
  },
  {
    headerMode: 'none',
    mode: 'modal',
  },
);

const defaultNavigationState = {
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
    { key: 'LoggedOutModal', routeName: 'LoggedOutModal' },
  ],
};

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
    return {
      ...state,
      navigationState: handleURL(state.navigationState, action.payload),
    };
  } else if (
    action.type === "LOG_IN_SUCCESS" ||
      action.type === "REGISTER_SUCCESS" ||
      action.type === "NAVIGATE_TO_APP"
  ) {
    return {
      ...state,
      navigationState: removeModals(state.navigationState),
    };
  } else if (action.type === "LOG_OUT_STARTED") {
    return {
      ...state,
      navigationState: ensureLoggedOutModalPresence(state.navigationState),
    };
  } else if (action.type === "SET_COOKIE") {
    return {
      ...state,
      navigationState: logOutIfCookieInvalidated(
        state.navigationState,
        action.payload,
      ),
    };
  }
  return state;
}

function handleURL(
  state: NavigationState,
  url: string,
): NavigationState {
  const partialNavInfo = partialNavInfoFromURL(url);
  if (!partialNavInfo.verify) {
    // TODO correctly handle non-verify URLs
    return state;
  }

  // Special-case behavior if there's already a VerificationModal
  const currentRoute = state.routes[state.index];
  if (currentRoute.key === 'VerificationModal') {
    const newRoute = {
      ...currentRoute,
      params: {
        verifyCode: partialNavInfo.verify,
      },
    };
    const newRoutes = [...state.routes];
    newRoutes[state.index] = newRoute;
    return {
      index: state.index,
      routes: newRoutes,
    };
  }

  return {
    index: state.index + 1,
    routes: [
      ...state.routes,
      {
        key: 'VerificationModal',
        routeName: 'VerificationModal',
        params: {
          verifyCode: partialNavInfo.verify,
        },
      },
    ],
  };
}

function removeModals(state: NavigationState): NavigationState {
  const newRoutes = [];
  let index = state.index;
  for (let i = 0; i < state.routes.length; i++) {
    const route = state.routes[i];
    if (
      route.routeName === 'LoggedOutModal' ||
        route.routeName === 'VerificationModal'
    ) {
      if (i <= state.index) {
        invariant(index !== 0, 'Attempting to remove only route');
        index--;
      }
    } else {
      newRoutes.push(route);
    }
  }
  if (newRoutes.length === state.routes.length) {
    return state;
  } else {
    return { index, routes: newRoutes };
  }
}

function ensureLoggedOutModalPresence(state: NavigationState): NavigationState {
  const currentModalIndex =
    _findIndex(['routeName', 'LoggedOutModal'])(state.routes);
  if (currentModalIndex >= 0 && state.index >= currentModalIndex) {
    return state;
  } else if (currentModalIndex >= 0) {
    return {
      index: currentModalIndex,
      routes: state.routes,
    };
  }
  return {
    index: state.routes.length,
    routes: [
      ...state.routes,
      { key: 'LoggedOutModal', routeName: 'LoggedOutModal' },
    ],
  };
}

type SetCookiePayload = {
  cookie: ?string,
  calendarInfos: {[id: string]: CalendarInfo},
  cookieInvalidated: bool,
};
function logOutIfCookieInvalidated(
  state: NavigationState,
  payload: SetCookiePayload,
): NavigationState {
  if (payload.cookieInvalidated) {
    Alert.alert(
      "Session invalidated",
      "We're sorry, but your session was invalidated by the server. " +
        "Please log in again.",
      [ { text: 'OK' } ],
      { cancelable: false },
    );
    return ensureLoggedOutModalPresence(state);
  }
  return state;
}

export {
  RootNavigator,
  defaultNavigationState,
  reduceNavInfo,
};
