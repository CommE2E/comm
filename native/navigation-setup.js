// @flow

import type { BaseAction } from 'lib/types/redux-types';
import type { BaseNavInfo } from 'lib/types/nav-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import type {
  NavigationState,
  NavigationScreenProp,
  NavigationAction,
  NavigationRouter,
} from 'react-navigation/src/TypeDefinition';
import type { PingSuccessPayload } from 'lib/types/ping-types';
import type { AppState } from './redux-setup';
import type { SetCookiePayload } from 'lib/utils/action-utils';

import {
  TabNavigator,
  StackNavigator,
  NavigationActions,
} from 'react-navigation';
import invariant from 'invariant';
import _findIndex from 'lodash/fp/findIndex';
import _includes from 'lodash/fp/includes';
import { Alert, BackHandler } from 'react-native';
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { infoFromURL } from 'lib/utils/url-utils';
import { fifteenDaysEarlier, fifteenDaysLater } from 'lib/utils/date-utils';
import { setCookieActionType } from 'lib/utils/action-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
} from 'lib/actions/user-actions';
import { pingActionTypes } from 'lib/actions/ping-actions';

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
import { MessageListRouteName } from './chat/message-list.react';

export type NavInfo = {|
  ...$Exact<BaseNavInfo>,
  navigationState: NavigationState,
|};

const handleURLActionType = "HANDLE_URL";
const navigateToAppActionType = "NAVIGATE_TO_APP";

export type Action = BaseAction |
  NavigationAction |
  {| type: typeof handleURLActionType, payload: string |} |
  {| type: typeof navigateToAppActionType, payload: null |} |
  {|
    type: typeof NavigationActions.NAVIGATE,
    routeName: typeof MessageListRouteName,
    params: { threadInfo: ThreadInfo },
  |};

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
type WrappedAppNavigatorProps = {|
  navigation: NavigationScreenProp<*>,
  isForeground: bool,
  atInitialRoute: bool,
|};
class WrappedAppNavigator
  extends React.PureComponent<WrappedAppNavigatorProps> {

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
const ReduxWrappedAppNavigator = connect((state: AppState) => {
  const appNavState = state.navInfo.navigationState.routes[0];
  invariant(
    appNavState.index !== undefined &&
      appNavState.index !== null &&
      typeof appNavState.index === "number",
    "appNavState should have member index that is a number",
  );
  return {
    atInitialRoute: appNavState.index === 0,
    isForeground: isForegroundSelector(state),
  };
})(WrappedAppNavigator);
(ReduxWrappedAppNavigator: Object).router = AppNavigator.router;

const RootNavigator = StackNavigator(
  {
    [LoggedOutModalRouteName]: { screen: LoggedOutModal },
    [VerificationModalRouteName]: { screen: VerificationModal },
    [AppRouteName]: { screen: ReduxWrappedAppNavigator },
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
      index: 1,
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

function reduceNavInfo(state: NavInfo, action: *): NavInfo {
  // React Navigation actions
  const navigationState = RootNavigator.router.getStateForAction(
    action,
    state.navigationState,
  )
  if (navigationState && navigationState !== state.navigationState) {
    return {
      startDate: state.startDate,
      endDate: state.endDate,
      home: state.home,
      threadID: state.threadID,
      navigationState,
    };
  }
  // Deep linking
  if (action.type === handleURLActionType) {
    return {
      startDate: state.startDate,
      endDate: state.endDate,
      home: state.home,
      threadID: state.threadID,
      navigationState: handleURL(state.navigationState, action.payload),
    };
  } else if (
    action.type === logInActionTypes.success ||
      action.type === registerActionTypes.success ||
      action.type === navigateToAppActionType
  ) {
    return {
      startDate: state.startDate,
      endDate: state.endDate,
      home: state.home,
      threadID: state.threadID,
      navigationState: removeModals(state.navigationState),
    };
  } else if (
    action.type === logOutActionTypes.started ||
      action.type === deleteAccountActionTypes.success
  ) {
    return resetNavInfoAndEnsureLoggedOutModalPresence(state);
  } else if (action.type === setCookieActionType) {
    return logOutIfCookieInvalidated(state, action.payload);
  } else if (action.type === pingActionTypes.success) {
    return {
      startDate: state.startDate,
      endDate: state.endDate,
      home: state.home,
      threadID: state.threadID,
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
    return {
      startDate: defaultNavInfo.startDate,
      endDate: defaultNavInfo.endDate,
      home: defaultNavInfo.home,
      threadID: defaultNavInfo.threadID,
      navigationState,
    };
  } else if (currentModalIndex >= 0) {
    return {
      startDate: defaultNavInfo.startDate,
      endDate: defaultNavInfo.endDate,
      home: defaultNavInfo.home,
      threadID: defaultNavInfo.threadID,
      navigationState: {
        ...navigationState,
        index: currentModalIndex,
      },
    };
  }
  return {
    startDate: defaultNavInfo.startDate,
    endDate: defaultNavInfo.endDate,
    home: defaultNavInfo.home,
    threadID: defaultNavInfo.threadID,
    navigationState: {
      index: navigationState.routes.length,
      routes: [
        ...navigationState.routes,
        { key: 'LoggedOutModal', routeName: LoggedOutModalRouteName },
      ],
    },
  };
}

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
  handleURLActionType,
  navigateToAppActionType,
  RootNavigator,
  defaultNavInfo,
  reduceNavInfo,
  LoggedOutModalRouteName,
  VerificationModalRouteName,
  AppRouteName,
};
