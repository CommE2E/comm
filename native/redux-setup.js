// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserInfo } from 'lib/types/user-types';
import type { MessageStore } from 'lib/types/message-types';
import type { NavInfo, Action } from './navigation-setup';

import React from 'react';
import invariant from 'invariant';
import { REHYDRATE } from 'redux-persist/constants';
import thunk from 'redux-thunk';
import { AsyncStorage } from 'react-native';
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'remote-redux-devtools';
import { autoRehydrate, persistStore } from 'redux-persist';
import PropTypes from 'prop-types';

import baseReducer from 'lib/reducers/master-reducer';
import { newSessionID } from 'lib/selectors/session-selectors';

import {
  RootNavigator,
  defaultNavInfo,
  reduceNavInfo,
} from './navigation-setup';

export type AppState = {|
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  sessionID: string,
  entryInfos: {[id: string]: EntryInfo},
  daysToEntries: {[day: string]: string[]},
  lastUserInteraction: {[section: string]: number},
  threadInfos: {[id: string]: ThreadInfo},
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
  rehydrateConcluded: bool,
|};

const defaultState = ({
  navInfo: defaultNavInfo,
  currentUserInfo: null,
  sessionID: newSessionID(),
  entryInfos: {},
  daysToEntries: {},
  lastUserInteraction: { calendar: 0, sessionReset: Date.now() },
  threadInfos: {},
  userInfos: {},
  messageStore: {
    messages: {},
    threads: {},
    currentAsOf: 0,
  },
  loadingStatuses: {},
  cookie: null,
  rehydrateConcluded: false,
}: AppState);

const blacklist = __DEV__
  ? [
      'sessionID',
      'lastUserInteraction',
      'loadingStatuses',
      'rehydrateConcluded',
    ]
  : [
      'sessionID',
      'lastUserInteraction',
      'loadingStatuses',
      'rehydrateConcluded',
      'navInfo',
    ];

function reducer(state: AppState, action: Action) {
  const navInfo = reduceNavInfo(state && state.navInfo, action);
  if (navInfo && navInfo !== state.navInfo) {
    state = {
      navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryInfos: state.entryInfos,
      daysToEntries: state.daysToEntries,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      rehydrateConcluded: state.rehydrateConcluded,
    };
  }
  if (action.type === REHYDRATE) {
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryInfos: state.entryInfos,
      daysToEntries: state.daysToEntries,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      rehydrateConcluded: true,
    };
  }
  if (action.type === "HANDLE_URL" || action.type === "NAVIGATE_TO_APP") {
    return state;
  }
  if (
    action.type === "Navigation/NAVIGATE" &&
    action.routeName === "MessageList"
  ) {
    return {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      entryInfos: state.entryInfos,
      daysToEntries: state.daysToEntries,
      lastUserInteraction: state.lastUserInteraction,
      threadInfos: state.threadInfos,
      userInfos: state.userInfos,
      messageStore: {
        messages: state.messageStore.messages,
        threads: {
          ...state.messageStore.threads,
          [action.params.threadInfo.id]: {
            ...state.messageStore.threads[action.params.threadInfo.id],
            lastNavigatedTo: Date.now(),
          },
        },
        currentAsOf: state.messageStore.currentAsOf,
      },
      loadingStatuses: state.loadingStatuses,
      cookie: state.cookie,
      rehydrateConcluded: state.rehydrateConcluded,
    };
  }
  return baseReducer(state, action);
}

const store = createStore(
  reducer,
  defaultState,
  composeWithDevTools(
    applyMiddleware(thunk),
    autoRehydrate(),
  ),
);
const persistor = persistStore(store, { storage: AsyncStorage, blacklist });

export {
  store,
  persistor,
};
