// @flow

import type { AppState } from './redux-setup';
import { defaultCalendarFilters } from 'lib/types/filter-types';
import { defaultConnectionInfo } from 'lib/types/socket-types';
import { messageTypes } from 'lib/types/message-types';
import { defaultGlobalThemeInfo } from '../types/themes';
import { defaultDeviceCameraInfo } from '../types/camera';

import { createMigrate } from 'redux-persist';
import invariant from 'invariant';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import Orientation from 'react-native-orientation-locker';

import { highestLocalIDSelector } from 'lib/selectors/local-id-selectors';
import { unshimMessageStore } from 'lib/shared/unshim-utils';
import { inconsistencyResponsesToReports } from 'lib/shared/report-utils';

import { defaultNotifPermissionAlertInfo } from '../push/alerts';

const migrations = {
  [1]: (state: AppState) => ({
    ...state,
    notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  }),
  [2]: (state: AppState) => ({
    ...state,
    messageSentFromRoute: [],
  }),
  [3]: state => ({
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
  [6]: state => ({
    ...state,
    threadInfos: undefined,
    threadStore: {
      threadInfos: state.threadInfos,
      inconsistencyResponses: [],
    },
  }),
  [7]: state => ({
    ...state,
    lastUserInteraction: undefined,
    sessionID: undefined,
    entryStore: {
      ...state.entryStore,
      inconsistencyResponses: [],
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
    connection: {
      ...state.connection,
      lateResponses: [],
    },
  }),
  [10]: (state: AppState) => ({
    ...state,
    nextLocalID: highestLocalIDSelector(state) + 1,
    connection: {
      ...state.connection,
      showDisconnectedBar: false,
    },
    messageStore: {
      ...state.messageStore,
      local: {},
    },
  }),
  [11]: (state: AppState) => ({
    ...state,
    messageStore: unshimMessageStore(state.messageStore, [messageTypes.IMAGES]),
  }),
  [12]: (state: AppState) => ({
    ...state,
    globalThemeInfo: defaultGlobalThemeInfo,
  }),
  [13]: (state: AppState) => ({
    ...state,
    deviceCameraInfo: defaultDeviceCameraInfo,
    deviceOrientation: Orientation.getInitialOrientation(),
  }),
  [14]: (state: AppState) => ({
    ...state,
    messageStore: unshimMessageStore(state.messageStore, [
      messageTypes.MULTIMEDIA,
    ]),
  }),
  [15]: state => ({
    ...state,
    threadStore: {
      ...state.threadStore,
      inconsistencyReports: inconsistencyResponsesToReports(
        state.threadStore.inconsistencyResponses,
      ),
      inconsistencyResponses: undefined,
    },
    entryStore: {
      ...state.entryStore,
      inconsistencyReports: inconsistencyResponsesToReports(
        state.entryStore.inconsistencyResponses,
      ),
      inconsistencyResponses: undefined,
    },
    queuedReports: [],
  }),
  [16]: state => {
    const result = {
      ...state,
      messageSentFromRoute: undefined,
      dataLoaded: !!state.currentUserInfo && !state.currentUserInfo.anonymous,
    };
    if (state.navInfo) {
      result.navInfo = {
        ...state.navInfo,
        navigationState: undefined,
      };
    }
    return result;
  },
};

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: [
    'loadingStatuses',
    'foreground',
    'dimensions',
    'connectivity',
    'deviceOrientation',
    'frozen',
  ],
  debug: __DEV__,
  version: 16,
  migrate: createMigrate(migrations, { debug: __DEV__ }),
  timeout: __DEV__ ? 0 : undefined,
};

const codeVersion = 56;

// This local exists to avoid a circular dependency where redux-setup needs to
// import all the navigation and screen stuff, but some of those screens want to
// access the persistor to purge its state.
let storedPersistor = null;
function setPersistor(persistor: *) {
  storedPersistor = persistor;
}
function getPersistor() {
  invariant(storedPersistor, 'should be set');
  return storedPersistor;
}

export { persistConfig, codeVersion, setPersistor, getPersistor };
