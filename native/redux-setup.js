// @flow

import type { RawThreadInfo } from 'lib/types/thread-types';
import type { EntryStore } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserInfo } from 'lib/types/user-types';
import type { MessageStore } from 'lib/types/message-types';
import type { NavInfo } from './navigation-setup';
import type { PersistState } from 'redux-persist/src/types';
import {
  type NotifPermissionAlertInfo,
  defaultNotifPermissionAlertInfo,
  recordNotifPermissionAlertActionType,
} from './push/alerts';
import type { NavigationStateRoute, NavigationRoute } from 'react-navigation';

import React from 'react';
import invariant from 'invariant';
import thunk from 'redux-thunk';
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { persistStore, persistReducer } from 'redux-persist';
import PropTypes from 'prop-types';
import { NavigationActions } from 'react-navigation';
import {
  createReactNavigationReduxMiddleware,
} from 'react-navigation-redux-helpers';

import baseReducer from 'lib/reducers/master-reducer';
import { newSessionID } from 'lib/selectors/session-selectors';
import { notificationPressActionType } from 'lib/shared/notif-utils';
import { sendMessageActionTypes } from 'lib/actions/message-actions';
import { pingActionTypes } from 'lib/actions/ping-actions';

import { MessageListRouteName } from './chat/message-list.react';
import { activeThreadSelector } from './selectors/nav-selectors';
import {
  handleURLActionType,
  navigateToAppActionType,
  defaultNavInfo,
  reduceNavInfo,
  removeScreensFromStack,
} from './navigation-setup';
import {
  recordAndroidNotificationActionType,
  clearAndroidNotificationActionType,
  reduceThreadIDsToNotifIDs,
} from './push/android';
import { persistConfig, setPersistor } from './persist';
import reduxLogger from './redux-logger';
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
import { ComposeThreadRouteName } from './chat/compose-thread.react';

export type AppState = {|
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  sessionID: string,
  entryStore: EntryStore,
  lastUserInteraction: {[section: string]: number},
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  drafts: {[key: string]: string},
  updatesCurrentAsOf: number,
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
  deviceToken: ?string,
  urlPrefix: string,
  customServer: ?string,
  threadIDsToNotifIDs: {[threadID: string]: string[]},
  notifPermissionAlertInfo: NotifPermissionAlertInfo,
  messageSentFromRoute: $ReadOnlyArray<string>,
  lastPingTime: number,
  _persist: ?PersistState,
|};

const defaultState = ({
  navInfo: defaultNavInfo,
  currentUserInfo: null,
  sessionID: newSessionID(),
  entryStore: {
    entryInfos: {},
    daysToEntries: {},
    lastUserInteractionCalendar: 0,
  },
  lastUserInteraction: { sessionReset: Date.now() },
  threadInfos: {},
  userInfos: {},
  messageStore: {
    messages: {},
    threads: {},
    currentAsOf: 0,
  },
  drafts: {},
  updatesCurrentAsOf: 0,
  loadingStatuses: {},
  cookie: null,
  deviceToken: null,
  urlPrefix: defaultURLPrefix(),
  customServer: natServer,
  threadIDsToNotifIDs: {},
  notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  messageSentFromRoute: [],
  lastPingTime: 0,
  _persist: null,
}: AppState);

function chatRouteFromNavInfo(navInfo: NavInfo): NavigationStateRoute {
  const navState = navInfo.navigationState;
  const appRoute = assertNavigationRouteNotLeafNode(navState.routes[0]);
  return assertNavigationRouteNotLeafNode(appRoute.routes[1]);
}

function reducer(state: AppState = defaultState, action: *) {
  const oldState = state;
  let navInfo = reduceNavInfo(state, action);

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
          home: navInfo.home,
          threadID: navInfo.threadID,
          navigationState: {
            ...navInfo.navigationState,
            routes: newRootSubRoutes,
          },
        };
      }
    }

    state = {
      navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      customServer: state.customServer,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      notifPermissionAlertInfo: state.notifPermissionAlertInfo,
      messageSentFromRoute: state.messageSentFromRoute,
      lastPingTime: state.lastPingTime,
      _persist: state._persist,
    };
  }
  if (
    action.type === recordAndroidNotificationActionType ||
    action.type === clearAndroidNotificationActionType
  ) {
    return {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      customServer: state.customServer,
      threadIDsToNotifIDs: reduceThreadIDsToNotifIDs(
        state.threadIDsToNotifIDs,
        action,
      ),
      notifPermissionAlertInfo: state.notifPermissionAlertInfo,
      messageSentFromRoute: state.messageSentFromRoute,
      lastPingTime: state.lastPingTime,
      _persist: state._persist,
    };
  } else if (action.type === setCustomServer) {
    return {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      customServer: action.payload,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      notifPermissionAlertInfo: state.notifPermissionAlertInfo,
      messageSentFromRoute: state.messageSentFromRoute,
      lastPingTime: state.lastPingTime,
      _persist: state._persist,
    };
  } else if (action.type === recordNotifPermissionAlertActionType) {
    return {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      customServer: state.customServer,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      notifPermissionAlertInfo: {
        totalAlerts: state.notifPermissionAlertInfo.totalAlerts + 1,
        lastAlertTime: action.payload.time,
      },
      messageSentFromRoute: state.messageSentFromRoute,
      lastPingTime: state.lastPingTime,
      _persist: state._persist,
    };
  }
  // These action type are handled by reduceNavInfo above
  if (
    action.type === handleURLActionType ||
      action.type === navigateToAppActionType ||
      action.type === notificationPressActionType ||
      action.type === NavigationActions.INIT ||
      action.type === NavigationActions.NAVIGATE ||
      action.type === NavigationActions.BACK ||
      action.type === NavigationActions.SET_PARAMS ||
      action.type === NavigationActions.RESET
  ) {
    return validateState(oldState, state);
  }
  if (action.type === sendMessageActionTypes.started) {
    const chatRoute = chatRouteFromNavInfo(state.navInfo);
    const currentChatSubroute = currentLeafRoute(chatRoute);
    const messageSentFromRoute =
      state.messageSentFromRoute.includes(currentChatSubroute.key)
        ? state.messageSentFromRoute
        : [ ...state.messageSentFromRoute, currentChatSubroute.key];
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      customServer: state.customServer,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      notifPermissionAlertInfo: state.notifPermissionAlertInfo,
      messageSentFromRoute,
      lastPingTime: state.lastPingTime,
      _persist: state._persist,
    };
  }
  if (action.type === pingActionTypes.success) {
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      customServer: state.customServer,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      notifPermissionAlertInfo: state.notifPermissionAlertInfo,
      messageSentFromRoute: state.messageSentFromRoute,
      lastPingTime: Date.now(),
      _persist: state._persist,
    };
  }
  return validateState(oldState, baseReducer(state, action));
}

function validateState(oldState: AppState, state: AppState): AppState {
  const oldActiveThread = activeThreadSelector(oldState);
  const activeThread = activeThreadSelector(state);
  if (activeThread && state.threadInfos[activeThread].currentUser.unread) {
    // Makes sure a currently focused thread is never unread
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: {
        ...state.threadInfos,
        [activeThread]: {
          ...state.threadInfos[activeThread],
          currentUser: {
            ...state.threadInfos[activeThread].currentUser,
            unread: false,
          },
        },
      },
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      customServer: state.customServer,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      notifPermissionAlertInfo: state.notifPermissionAlertInfo,
      messageSentFromRoute: state.messageSentFromRoute,
      lastPingTime: state.lastPingTime,
      _persist: state._persist,
    };
  }
  if (
    activeThread &&
    oldActiveThread !== activeThread &&
    state.messageStore.threads[activeThread]
  ) {
    // Update messageStore.threads[activeThread].lastNavigatedTo
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: {
        messages: state.messageStore.messages,
        threads: {
          ...state.messageStore.threads,
          [activeThread]: {
            ...state.messageStore.threads[activeThread],
            lastNavigatedTo: Date.now(),
          },
        },
        currentAsOf: state.messageStore.currentAsOf,
      },
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      customServer: state.customServer,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      notifPermissionAlertInfo: state.notifPermissionAlertInfo,
      messageSentFromRoute: state.messageSentFromRoute,
      lastPingTime: state.lastPingTime,
      _persist: state._persist,
    };
  }

  const chatRoute = chatRouteFromNavInfo(state.navInfo);
  const chatSubrouteKeys = new Set(chatRoute.routes.map(route => route.key));
  const messageSentFromRoute = state.messageSentFromRoute.filter(
    key => chatSubrouteKeys.has(key),
  );
  if (messageSentFromRoute.length !== state.messageSentFromRoute.length) {
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      customServer: state.customServer,
      threadIDsToNotifIDs: state.threadIDsToNotifIDs,
      notifPermissionAlertInfo: state.notifPermissionAlertInfo,
      messageSentFromRoute,
      lastPingTime: state.lastPingTime,
      _persist: state._persist,
    };
  }

  return state;
}

const reduxLoggerMiddleware = store => next => action => {
  // We want the state before the action
  const state = store.getState();
  reduxLogger.addAction(action, state);
  return next(action);
};

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
};
