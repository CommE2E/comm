// @flow

import type { BaseAction } from 'lib/types/redux-types';
import type { BaseNavInfo } from 'lib/types/nav-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import type {
  NavigationState,
  NavigationScreenProp,
  NavigationRoute,
  NavigationAction,
  NavigationRouter,
} from 'react-navigation';
import type { PingSuccessPayload } from 'lib/types/ping-types';
import type { AppState } from './redux-setup';

import { TabNavigator, StackNavigator } from 'react-navigation';
import invariant from 'invariant';
import _findIndex from 'lodash/fp/findIndex';
import _includes from 'lodash/fp/includes';
import { Alert, BackHandler } from 'react-native';
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { infoFromURL } from 'lib/utils/url-utils';
import { fifteenDaysEarlier, fifteenDaysLater } from 'lib/utils/date-utils';

import {
  Calendar,
  CalendarRouteName,
} from './calendar/calendar.react';
import {
  Chat,
  ChatRouteName,
} from './chat/chat.react';
import { ChatThreadListRouteName } from './chat/chat-thread-list.react';
import More from './more/more.react';
import {
  LoggedOutModal,
  LoggedOutModalRouteName,
} from './account/logged-out-modal.react';
import {
  VerificationModal,
  VerificationModalRouteName,
} from './account/verification-modal.react';
import { createIsForegroundSelector } from './selectors/nav-selectors';

export type NavInfo = BaseNavInfo & {
  navigationState: NavigationState,
};

export type Action = BaseAction |
  { type: "HANDLE_URL", payload: string } |
  { type: "NAVIGATE_TO_APP", payload: null } |
  {
    type: "Navigation/NAVIGATE",
    routeName: "MessageList",
    params: { threadInfo: ThreadInfo },
  };

const AppNavigator = TabNavigator(
  {
    [CalendarRouteName]: { screen: Calendar },
    [ChatRouteName]: { screen: Chat },
    More: { screen: More },
  },
  {
    lazy: false,
    initialRouteName: CalendarRouteName,
  },
);
type WrappedAppNavigatorProps = {
  navigation: NavigationScreenProp<NavigationRoute, NavigationAction>,
  isForeground: bool,
  atInitialRoute: bool,
};
class WrappedAppNavigator extends React.PureComponent {

  props: WrappedAppNavigatorProps;
  static propTypes = {
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    isForeground: PropTypes.bool.isRequired,
    atInitialRoute: PropTypes.bool.isRequired,
  };

  componentDidMount() {
    if (this.props.isForeground) {
      this.onForeground();
    }
  }

  componentWillReceiveProps(nextProps: WrappedAppNavigatorProps) {
    if (!this.props.isForeground && nextProps.isForeground) {
      this.onForeground();
    } else if (this.props.isForeground && !nextProps.isForeground) {
      this.onBackground();
    }
  }

  onForeground() {
    BackHandler.addEventListener('hardwareBackPress', this.hardwareBack);
  }

  onBackground() {
    BackHandler.removeEventListener('hardwareBackPress', this.hardwareBack);
  }

  hardwareBack = () => {
    if (this.props.atInitialRoute) {
      return false;
    }
    this.props.navigation.goBack(null);
    return true;
  }

  render() {
    return <AppNavigator navigation={this.props.navigation} />;
  }

}
const AppRouteName = 'App';
const isForegroundSelector = createIsForegroundSelector(AppRouteName);
const ReduxWrappedAppNavigator = connect((state: AppState) => ({
  isForeground: isForegroundSelector(state),
  atInitialRoute: state.navInfo.navigationState.routes[0].index === 0,
}))(WrappedAppNavigator);
const ReduxWrappedAppNavigatorWithRouter = {
  ...ReduxWrappedAppNavigator,
  router: AppNavigator.router,
};

const RootNavigator = StackNavigator(
  {
    [LoggedOutModalRouteName]: { screen: LoggedOutModal },
    [VerificationModalRouteName]: { screen: VerificationModal },
    [AppRouteName]: { screen: ReduxWrappedAppNavigatorWithRouter },
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
      routeName: AppRouteName,
      index: 0,
      routes: [
        { key: 'Calendar', routeName: CalendarRouteName },
        {
          key: 'Chat',
          routeName: ChatRouteName,
          index: 0,
          routes: [
            { key: 'ChatThreadList', routeName: ChatThreadListRouteName },
          ],
        },
        { key: 'More', routeName: 'More' },
      ],
    },
    { key: 'LoggedOutModal', routeName: LoggedOutModalRouteName },
  ],
};

const defaultNavInfo: NavInfo = {
  startDate: fifteenDaysEarlier().valueOf(),
  endDate: fifteenDaysLater().valueOf(),
  home: true,
  threadID: null,
  navigationState: defaultNavigationState,
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
  } else if (
    action.type === "LOG_OUT_STARTED" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    return resetNavInfoAndEnsureLoggedOutModalPresence(state);
  } else if (action.type === "SET_COOKIE") {
    return logOutIfCookieInvalidated(state, action.payload);
  } else if (action.type === "PING_SUCCESS") {
    return {
      ...state,
      navigationState: removeModalsIfPingIndicatesLoggedIn(
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
  const urlInfo = infoFromURL(url);
  if (!urlInfo.verify) {
    // TODO correctly handle non-verify URLs
    return state;
  }

  // Special-case behavior if there's already a VerificationModal
  const currentRoute = state.routes[state.index];
  if (currentRoute.key === 'VerificationModal') {
    const newRoute = {
      ...currentRoute,
      params: {
        verifyCode: urlInfo.verify,
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
          verifyCode: urlInfo.verify,
        },
      },
    ],
  };
}

function removeModals(
  state: NavigationState,
  modalRouteNames: string[]
    = [LoggedOutModalRouteName, VerificationModalRouteName],
): NavigationState {
  const newRoutes = [];
  let index = state.index;
  for (let i = 0; i < state.routes.length; i++) {
    const route = state.routes[i];
    if (_includes(route.routeName)(modalRouteNames)) {
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

function resetNavInfoAndEnsureLoggedOutModalPresence(state: NavInfo): NavInfo {
  const navigationState = {
    ...state.navigationState,
    routes: [
      ...state.navigationState.routes,
    ],
  };
  navigationState.routes[0] = defaultNavInfo.navigationState.routes[0];
  const currentModalIndex =
    _findIndex(['routeName', LoggedOutModalRouteName])(navigationState.routes);
  if (currentModalIndex >= 0 && navigationState.index >= currentModalIndex) {
    return { ...defaultNavInfo, navigationState };
  } else if (currentModalIndex >= 0) {
    return {
      ...defaultNavInfo,
      navigationState: {
        ...navigationState,
        index: currentModalIndex,
      },
    };
  }
  return {
    ...defaultNavInfo,
    navigationState: {
      index: navigationState.routes.length,
      routes: [
        ...navigationState.routes,
        { key: 'LoggedOutModal', routeName: LoggedOutModalRouteName },
      ],
    },
  };
}

type SetCookiePayload = {
  cookie: ?string,
  threadInfos?: {[id: string]: ThreadInfo},
  cookieInvalidated?: bool,
};
function logOutIfCookieInvalidated(
  state: NavInfo,
  payload: SetCookiePayload,
): NavInfo {
  if (payload.cookieInvalidated) {
    const newState = resetNavInfoAndEnsureLoggedOutModalPresence(state);
    if (state !== newState) {
      Alert.alert(
        "Session invalidated",
        "We're sorry, but your session was invalidated by the server. " +
          "Please log in again.",
        [ { text: 'OK' } ],
      );
    }
    return newState;
  }
  return state;
}

function removeModalsIfPingIndicatesLoggedIn(
  state: NavigationState,
  payload: PingSuccessPayload,
): NavigationState {
  if (!payload.userInfo || payload.loggedIn) {
    // The SET_COOKIE action should handle logging somebody out as a result of a
    // cookie invalidation triggered by a ping server call. PING_SUCCESS is only
    // handling specific log ins that occur from LoggedOutModal.
    return state;
  }
  return removeModals(state, [LoggedOutModalRouteName]);
}

export {
  RootNavigator,
  defaultNavInfo,
  reduceNavInfo,
  LoggedOutModalRouteName,
  VerificationModalRouteName,
  AppRouteName,
};
