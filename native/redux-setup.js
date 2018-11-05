// @flow

import type { ThreadStore } from 'lib/types/thread-types';
import type { EntryStore } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserInfo } from 'lib/types/user-types';
import type { MessageStore } from 'lib/types/message-types';
import type { NavInfo } from './navigation/navigation-setup';
import type { PersistState } from 'redux-persist/src/types';
import {
  type NotifPermissionAlertInfo,
  defaultNotifPermissionAlertInfo,
} from './push/alerts';
import type { NavigationStateRoute, NavigationRoute } from 'react-navigation';
import {
  type CalendarFilter,
  defaultCalendarFilters,
} from 'lib/types/filter-types';
import { setNewSessionActionType } from 'lib/utils/action-utils';
import { updateTypes } from 'lib/types/update-types';
import { setDeviceTokenActionTypes } from 'lib/actions/device-actions';
import {
  type ConnectionInfo,
  defaultConnectionInfo,
  incrementalStateSyncActionType,
} from 'lib/types/socket-types';

import React from 'react';
import invariant from 'invariant';
import thunk from 'redux-thunk';
import { createStore as defaultCreateStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { persistStore, persistReducer, REHYDRATE } from 'redux-persist';
import PropTypes from 'prop-types';
import { NavigationActions, StackActions } from 'react-navigation';
import {
  createReactNavigationReduxMiddleware,
} from 'react-navigation-redux-helpers';
import { AppState as NativeAppState } from 'react-native';

import baseReducer from 'lib/reducers/master-reducer';
import { notificationPressActionType } from 'lib/shared/notif-utils';
import {
  sendMessageActionTypes,
  saveMessagesActionType,
} from 'lib/actions/message-actions';
import { reduxLoggerMiddleware } from 'lib/utils/redux-logger';
import { defaultCalendarQuery } from 'lib/selectors/nav-selectors';

import { activeThreadSelector } from './selectors/nav-selectors';
import {
  handleURLActionType,
  navigateToAppActionType,
  resetUserStateActionType,
  recordNotifPermissionAlertActionType,
  recordAndroidNotificationActionType,
  clearAndroidNotificationActionType,
} from './navigation/action-types';
import {
  defaultNavInfo,
  reduceNavInfo,
  removeScreensFromStack,
  resetNavInfoAndEnsureLoggedOutModalPresence,
} from './navigation/navigation-setup';
import {
  reduceThreadIDsToNotifIDs,
} from './push/android';
import { persistConfig, setPersistor } from './persist';
import {
  defaultURLPrefix,
  natServer,
  setCustomServer,
} from './utils/url-utils';
import {
  assertNavigationRouteNotLeafNode,
  currentLeafRoute,
  findRouteIndexWithKey,
} from './utils/navigation-utils';
import {
  ComposeThreadRouteName,
  MessageListRouteName,
} from './navigation/route-names';
import reactotron from './reactotron';

const createStore = reactotron
  ? reactotron.createStore
  : defaultCreateStore;

export type AppState = {|
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  entryStore: EntryStore,
  threadStore: ThreadStore,
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  drafts: {[key: string]: string},
  updatesCurrentAsOf: number,
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  cookie: ?string,
  deviceToken: ?string,
  urlPrefix: string,
  customServer: ?string,
  threadIDsToNotifIDs: {[threadID: string]: string[]},
  notifPermissionAlertInfo: NotifPermissionAlertInfo,
  messageSentFromRoute: $ReadOnlyArray<string>,
  connection: ConnectionInfo,
  watchedThreadIDs: $ReadOnlyArray<string>,
  foreground: bool,
  _persist: ?PersistState,
  sessionID?: void,
|};

const defaultState = ({
  navInfo: defaultNavInfo,
  currentUserInfo: null,
  entryStore: {
    entryInfos: {},
    daysToEntries: {},
    actualizedCalendarQuery: defaultCalendarQuery(),
    lastUserInteractionCalendar: 0,
    inconsistencyResponses: [],
  },
  threadStore: {
    threadInfos: {},
    inconsistencyResponses: [],
  },
  userInfos: {},
  messageStore: {
    messages: {},
    threads: {},
    currentAsOf: 0,
  },
  drafts: {},
  updatesCurrentAsOf: 0,
  loadingStatuses: {},
  calendarFilters: defaultCalendarFilters,
  cookie: null,
  deviceToken: null,
  urlPrefix: defaultURLPrefix(),
  customServer: natServer,
  threadIDsToNotifIDs: {},
  notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  messageSentFromRoute: [],
  connection: defaultConnectionInfo,
  watchedThreadIDs: [],
  foreground: true,
  _persist: null,
}: AppState);

function chatRouteFromNavInfo(navInfo: NavInfo): NavigationStateRoute {
  const navState = navInfo.navigationState;
  const appRoute = assertNavigationRouteNotLeafNode(navState.routes[0]);
  return assertNavigationRouteNotLeafNode(appRoute.routes[1]);
}

function reducer(state: AppState = defaultState, action: *) {
  if (
    action.type === recordAndroidNotificationActionType ||
    action.type === clearAndroidNotificationActionType
  ) {
    return {
      ...state,
      threadIDsToNotifIDs: reduceThreadIDsToNotifIDs(
        state.threadIDsToNotifIDs,
        action,
      ),
    };
  } else if (action.type === setCustomServer) {
    return {
      ...state,
      customServer: action.payload,
    };
  } else if (action.type === recordNotifPermissionAlertActionType) {
    return {
      ...state,
      notifPermissionAlertInfo: {
        totalAlerts: state.notifPermissionAlertInfo.totalAlerts + 1,
        lastAlertTime: action.payload.time,
      },
    };
  } else if (action.type === resetUserStateActionType) {
    const cookie = state.cookie && state.cookie.startsWith("anonymous=")
      ? state.cookie
      : null;
    const currentUserInfo =
      state.currentUserInfo && state.currentUserInfo.anonymous
        ? state.currentUserInfo
        : null;
    return {
      ...state,
      currentUserInfo,
      cookie,
    };
  }

  const oldState = state;

  if (action.type === sendMessageActionTypes.started) {
    const chatRoute = chatRouteFromNavInfo(state.navInfo);
    const currentChatSubroute = currentLeafRoute(chatRoute);
    const messageSentFromRoute =
      state.messageSentFromRoute.includes(currentChatSubroute.key)
        ? state.messageSentFromRoute
        : [ ...state.messageSentFromRoute, currentChatSubroute.key];
    state = {
      ...state,
      messageSentFromRoute,
    };
  }

  if (action.type === setNewSessionActionType) {
    state = {
      ...state,
      cookie: action.payload.sessionChange.cookie,
    };
  } else if (action.type === setDeviceTokenActionTypes.started) {
    state = {
      ...state,
      deviceToken: action.payload,
    };
  } else if (action.type === incrementalStateSyncActionType) {
    let wipeDeviceToken = false;
    for (let update of action.payload.updatesResult.newUpdates) {
      if (
        update.type === updateTypes.BAD_DEVICE_TOKEN &&
        update.deviceToken === state.deviceToken
      ) {
        wipeDeviceToken = true;
        break;
      }
    }
    if (wipeDeviceToken) {
      state = {
        ...state,
        deviceToken: null,
      };
    }
  }

  state = baseReducer(state, action);

  let navInfo = reduceNavInfo(state, action, state.threadStore.threadInfos);
  if (navInfo && navInfo !== state.navInfo) {
    const chatRoute = chatRouteFromNavInfo(navInfo);
    const currentChatSubroute = currentLeafRoute(chatRoute);
    if (currentChatSubroute.routeName === ComposeThreadRouteName) {
      const oldChatRoute = chatRouteFromNavInfo(state.navInfo);
      const oldRouteIndex = findRouteIndexWithKey(
        oldChatRoute,
        currentChatSubroute.key,
      );
      const oldNextRoute = oldChatRoute.routes[oldRouteIndex + 1];
      if (
        oldNextRoute &&
        state.messageSentFromRoute.includes(oldNextRoute.key)
      ) {
        // This indicates that the user went to the compose thread screen, then
        // saw that a thread already existed for the people they wanted to
        // contact, and sent a message to that thread. We are now about to
        // navigate back to that compose thread screen, but instead, since the
        // user's intent has ostensibly already been satisfied, we will pop up
        // to the screen right before that one.
        const newChatRoute = removeScreensFromStack(
          chatRoute,
          (route: NavigationRoute) => route.key === currentChatSubroute.key
            ? "remove"
            : "keep",
        );

        const appRoute =
          assertNavigationRouteNotLeafNode(navInfo.navigationState.routes[0]);
        const newAppSubRoutes = [ ...appRoute.routes ];
        newAppSubRoutes[1] = newChatRoute;
        const newRootSubRoutes = [ ...navInfo.navigationState.routes ];
        newRootSubRoutes[0] = { ...appRoute, routes: newAppSubRoutes };
        navInfo = {
          startDate: navInfo.startDate,
          endDate: navInfo.endDate,
          navigationState: {
            ...navInfo.navigationState,
            routes: newRootSubRoutes,
          },
        };
      }
    }

    state = { ...state, navInfo };
  }

  return validateState(oldState, state, action);
}

function validateState(
  oldState: AppState,
  state: AppState,
  action: *,
): AppState {
  const activeThread = activeThreadSelector(state);
  if (
    activeThread &&
    (NativeAppState.currentState === "active" ||
      (appLastBecameInactive + 10000 < Date.now() &&
      action.type !== saveMessagesActionType)) &&
    state.threadStore.threadInfos[activeThread].currentUser.unread
  ) {
    // Makes sure a currently focused thread is never unread. Note that we
    // consider a backgrounded NativeAppState to actually be active if it last
    // changed to inactive more than 10 seconds ago. This is because there is a
    // delay when NativeAppState is updating in response to a foreground, and
    // actions don't get processed more than 10 seconds after a backgrounding
    // anyways. However we don't consider this for saveMessagesActionType, since
    // that action can be expected to happen while the app is backgrounded.
    state = {
      ...state,
      threadStore: {
        ...state.threadStore,
        threadInfos: {
          ...state.threadStore.threadInfos,
          [activeThread]: {
            ...state.threadStore.threadInfos[activeThread],
            currentUser: {
              ...state.threadStore.threadInfos[activeThread].currentUser,
              unread: false,
            },
          },
        },
      },
    };
  }

  const oldActiveThread = activeThreadSelector(oldState);
  if (
    activeThread &&
    oldActiveThread !== activeThread &&
    state.messageStore.threads[activeThread]
  ) {
    // Update messageStore.threads[activeThread].lastNavigatedTo
    state = {
      ...state,
      messageStore: {
        ...state.messageStore,
        threads: {
          ...state.messageStore.threads,
          [activeThread]: {
            ...state.messageStore.threads[activeThread],
            lastNavigatedTo: Date.now(),
          },
        },
      },
    };
  }

  const chatRoute = chatRouteFromNavInfo(state.navInfo);
  const chatSubrouteKeys = new Set(chatRoute.routes.map(route => route.key));
  const messageSentFromRoute = state.messageSentFromRoute.filter(
    key => chatSubrouteKeys.has(key),
  );
  if (messageSentFromRoute.length !== state.messageSentFromRoute.length) {
    state = {
      ...state,
      messageSentFromRoute,
    };
  }

  if (
    action.type !== REHYDRATE &&
    (!state.currentUserInfo || state.currentUserInfo.anonymous)
  ) {
    const navInfo = resetNavInfoAndEnsureLoggedOutModalPresence(state.navInfo);
    if (navInfo.navigationState !== state.navInfo.navigationState) {
      state = { ...state, navInfo };
    }
  }

  return state;
}

let appLastBecameInactive = 0;
function appBecameInactive() {
  appLastBecameInactive = Date.now();
}

const reactNavigationMiddleware = createReactNavigationReduxMiddleware(
  "root",
  (state: AppState) => state.navInfo.navigationState,
);
const store = createStore(
  persistReducer(persistConfig, reducer),
  defaultState,
  composeWithDevTools(
    applyMiddleware(thunk, reactNavigationMiddleware, reduxLoggerMiddleware),
  ),
);
const persistor = persistStore(store);
setPersistor(persistor);

export {
  store,
  appBecameInactive,
};
