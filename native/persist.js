// @flow

import type { AppState } from './redux-setup';
import { defaultCalendarFilters } from 'lib/types/filter-types';
import { defaultConnectionInfo } from 'lib/types/socket-types';

import storage from 'redux-persist/lib/storage';
import { createMigrate } from 'redux-persist';
import invariant from 'invariant';
import { Platform } from 'react-native';

import version from 'lib/facts/version';
import { highestLocalIDSelector } from 'lib/selectors/local-id-selectors';

import { nativeCalendarQuery } from './selectors/nav-selectors';
import { defaultNotifPermissionAlertInfo } from './push/alerts';

const blacklist = __DEV__
  ? [ 'loadingStatuses', 'foreground' ]
  : [ 'loadingStatuses', 'foreground', 'navInfo' ];

const migrations = {
  [1]: (state: AppState) => ({
    ...state,
    notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  }),
  [2]: (state: AppState) => ({
    ...state,
    messageSentFromRoute: [],
  }),
  [3]: (state) => ({
    currentUserInfo: state.currentUserInfo,
    entryStore: state.entryStore,
    threadInfos: state.threadInfos,
    userInfos: state.userInfos,
    messageStore: {
      ...state.messageStore,
      currentAsOf: state.currentAsOf,
    },
    drafts: state.drafts,
    updatesCurrentAsOf: state.currentAsOf,
    cookie: state.cookie,
    deviceToken: state.deviceToken,
    urlPrefix: state.urlPrefix,
    customServer: state.customServer,
    threadIDsToNotifIDs: state.threadIDsToNotifIDs,
    notifPermissionAlertInfo: state.notifPermissionAlertInfo,
    messageSentFromRoute: state.messageSentFromRoute,
    _persist: state._persist,
  }),
  [4]: (state: AppState) => ({
    ...state,
    pingTimestamps: undefined,
    activeServerRequests: undefined,
  }),
  [5]: (state: AppState) => ({
    ...state,
    calendarFilters: defaultCalendarFilters,
  }),
  [6]: (state) => ({
    ...state,
    threadInfos: undefined,
    threadStore: {
      threadInfos: state.threadInfos,
      inconsistencyResponses: [],
    },
  }),
  [7]: (state) => ({
    ...state,
    lastUserInteraction: undefined,
    sessionID: undefined,
    entryStore: {
      ...state.entryStore,
      inconsistencyResponses: [],
      actualizedCalendarQuery: nativeCalendarQuery(state)(),
    },
  }),
  [8]: (state: AppState) => ({
    ...state,
    pingTimestamps: undefined,
    activeServerRequests: undefined,
    connection: defaultConnectionInfo(Platform.OS),
    watchedThreadIDs: [],
    foreground: true,
    entryStore: {
      ...state.entryStore,
      actualizedCalendarQuery: undefined,
    },
  }),
  [9]: (state: AppState) => ({
    ...state,
    nextLocalID: highestLocalIDSelector(state),
    connection: {
      ...state.connection,
      lateResponses: [],
    },
  }),
  [9]: (state: AppState) => ({
    ...state,
    connection: {
      ...state.connection,
      lateResponses: [],
    },
  }),
  [10]: (state: AppState) => ({
    ...state,
    connection: {
      ...state.connection,
      showDisconnectedBar: false,
    },
    messageStore: {
      ...state.messageStore,
      local: {},
    },
  }),
};

const persistConfig = {
  key: 'root',
  storage,
  blacklist,
  debug: __DEV__,
  version: 10,
  migrate: createMigrate(migrations, { debug: __DEV__ }),
};

const codeVersion = version.currentCodeVersion;

// This local exists to avoid a circular dependency where redux-setup needs to
// import all the navigation and screen stuff, but some of those screens want to
// access the persistor to purge its state.
let storedPersistor = null;
function setPersistor(persistor: *) {
  storedPersistor = persistor;
}
function getPersistor() {
  invariant(storedPersistor, "should be set");
  return storedPersistor;
}

export {
  persistConfig,
  codeVersion,
  setPersistor,
  getPersistor,
};
