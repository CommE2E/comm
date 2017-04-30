// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import type { EntryInfo } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { UserInfo } from 'lib/types/user-types';
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

import {
  RootNavigator,
  defaultNavInfo,
  reduceNavInfo,
} from './navigation-setup';

export type AppState = {
  navInfo: NavInfo,
  userInfo: ?UserInfo,
  entryInfos: {[id: string]: EntryInfo},
  daysToEntries: {[day: string]: string[]},
  entriesWithinRangeLastUpdated: number,
  calendarInfos: {[id: string]: CalendarInfo},
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
  rehydrateConcluded: bool,
};

const defaultState = ({
  navInfo: defaultNavInfo,
  userInfo: null,
  entryInfos: {},
  daysToEntries: {},
  entriesWithinRangeLastUpdated: 0,
  calendarInfos: {},
  loadingStatuses: {},
  cookie: null,
  rehydrateConcluded: false,
}: AppState);

const blacklist = __DEV__
  ? ['loadingStatuses', 'rehydrateConcluded']
  : [
      'loadingStatuses',
      'rehydrateConcluded',
      'navInfo',
      'entriesWithinRangeLastUpdated',
    ];

function reducer(state: AppState, action: Action) {
  const navInfo = reduceNavInfo(state && state.navInfo, action);
  if (navInfo && navInfo !== state.navInfo) {
    state = { ...state, navInfo };
  }
  if (action.type === REHYDRATE) {
    return {
      ...state,
      rehydrateConcluded: true,
    };
  }
  if (action.type === "HANDLE_URL" || action.type === "NAVIGATE_TO_APP") {
    return state;
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
