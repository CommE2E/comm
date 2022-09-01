// @flow

import AsyncStorage from '@react-native-community/async-storage';
import invariant from 'invariant';
import { Platform } from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { createMigrate, createTransform } from 'redux-persist';
import type { Transform } from 'redux-persist/es/types';

import { highestLocalIDSelector } from 'lib/selectors/local-id-selectors';
import { inconsistencyResponsesToReports } from 'lib/shared/report-utils';
import { getContainingThreadID, getCommunity } from 'lib/shared/thread-utils';
import { unshimMessageStore } from 'lib/shared/unshim-utils';
import { defaultEnabledApps } from 'lib/types/enabled-apps';
import { defaultCalendarFilters } from 'lib/types/filter-types';
import { messageTypes } from 'lib/types/message-types';
import type { ClientDBMessageStoreOperation } from 'lib/types/message-types';
import { defaultConnectionInfo } from 'lib/types/socket-types';
import { translateRawMessageInfoToClientDBMessageInfo } from 'lib/utils/message-ops-utils';
import { convertThreadStoreOperationsToClientDBOperations } from 'lib/utils/thread-ops-utils';

import { defaultNotifPermissionAlertInfo } from '../push/alerts';
import { defaultDeviceCameraInfo } from '../types/camera';
import { defaultGlobalThemeInfo } from '../types/themes';
import { migrateThreadStoreForEditThreadPermissions } from './edit-thread-permission-migration';
import type { AppState } from './state-types';

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
  [14]: (state: AppState) => state,
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
  [17]: state => ({
    ...state,
    userInfos: undefined,
    userStore: {
      userInfos: state.userInfos,
      inconsistencyResponses: [],
    },
  }),
  [18]: state => ({
    ...state,
    userStore: {
      userInfos: state.userStore.userInfos,
      inconsistencyReports: [],
    },
  }),
  [19]: state => {
    const threadInfos = {};
    for (const threadID in state.threadStore.threadInfos) {
      const threadInfo = state.threadStore.threadInfos[threadID];
      const { visibilityRules, ...rest } = threadInfo;
      threadInfos[threadID] = rest;
    }
    return {
      ...state,
      threadStore: {
        ...state.threadStore,
        threadInfos,
      },
    };
  },
  [20]: (state: AppState) => ({
    ...state,
    messageStore: unshimMessageStore(state.messageStore, [
      messageTypes.UPDATE_RELATIONSHIP,
    ]),
  }),
  [21]: (state: AppState) => ({
    ...state,
    messageStore: unshimMessageStore(state.messageStore, [
      messageTypes.CREATE_SIDEBAR,
      messageTypes.SIDEBAR_SOURCE,
    ]),
  }),
  [22]: state => {
    for (const key in state.drafts) {
      const value = state.drafts[key];
      global.CommCoreModule.updateDraft({
        key,
        text: value,
      });
    }
    return {
      ...state,
      drafts: undefined,
    };
  },
  [23]: state => ({
    ...state,
    globalThemeInfo: defaultGlobalThemeInfo,
  }),
  [24]: state => ({
    ...state,
    enabledApps: defaultEnabledApps,
  }),
  [25]: state => ({
    ...state,
    crashReportsEnabled: __DEV__,
  }),
  [26]: state => {
    const { currentUserInfo } = state;
    if (currentUserInfo.anonymous) {
      return state;
    }
    return {
      ...state,
      crashReportsEnabled: undefined,
      currentUserInfo: {
        id: currentUserInfo.id,
        username: currentUserInfo.username,
      },
      enabledReports: {
        crashReports: __DEV__,
        inconsistencyReports: __DEV__,
        mediaReports: __DEV__,
      },
    };
  },
  [27]: state => ({
    ...state,
    queuedReports: undefined,
    enabledReports: undefined,
    threadStore: {
      ...state.threadStore,
      inconsistencyReports: undefined,
    },
    entryStore: {
      ...state.entryStore,
      inconsistencyReports: undefined,
    },
    reportStore: {
      enabledReports: {
        crashReports: __DEV__,
        inconsistencyReports: __DEV__,
        mediaReports: __DEV__,
      },
      queuedReports: [
        ...state.entryStore.inconsistencyReports,
        ...state.threadStore.inconsistencyReports,
        ...state.queuedReports,
      ],
    },
  }),
  [28]: state => {
    const threadParentToChildren = {};
    for (const threadID in state.threadStore.threadInfos) {
      const threadInfo = state.threadStore.threadInfos[threadID];
      const parentThreadInfo = threadInfo.parentThreadID
        ? state.threadStore.threadInfos[threadInfo.parentThreadID]
        : null;
      const parentIndex = parentThreadInfo ? parentThreadInfo.id : '-1';
      if (!threadParentToChildren[parentIndex]) {
        threadParentToChildren[parentIndex] = [];
      }
      threadParentToChildren[parentIndex].push(threadID);
    }

    const rootIDs = threadParentToChildren['-1'];
    if (!rootIDs) {
      // This should never happen, but if it somehow does we'll let the state
      // check mechanism resolve it...
      return state;
    }

    const threadInfos = {};
    const stack = [...rootIDs];
    while (stack.length > 0) {
      const threadID = stack.shift();
      const threadInfo = state.threadStore.threadInfos[threadID];
      const parentThreadInfo = threadInfo.parentThreadID
        ? threadInfos[threadInfo.parentThreadID]
        : null;
      threadInfos[threadID] = {
        ...threadInfo,
        containingThreadID: getContainingThreadID(
          parentThreadInfo,
          threadInfo.type,
        ),
        community: getCommunity(parentThreadInfo),
      };
      const children = threadParentToChildren[threadID];
      if (children) {
        stack.push(...children);
      }
    }
    return { ...state, threadStore: { ...state.threadStore, threadInfos } };
  },
  [29]: (state: AppState) => {
    const updatedThreadInfos = migrateThreadStoreForEditThreadPermissions(
      state.threadStore.threadInfos,
    );

    return {
      ...state,
      threadStore: {
        ...state.threadStore,
        threadInfos: updatedThreadInfos,
      },
    };
  },
  [30]: (state: AppState) => {
    const threadInfos = state.threadStore.threadInfos;
    const operations = [
      {
        type: 'remove_all',
      },
      ...Object.keys(threadInfos).map((id: string) => ({
        type: 'replace',
        payload: { id, threadInfo: threadInfos[id] },
      })),
    ];
    const processingResult: boolean = global.CommCoreModule.processThreadStoreOperationsSync(
      convertThreadStoreOperationsToClientDBOperations(operations),
    );
    if (!processingResult) {
      return { ...state, cookie: null };
    }
    return state;
  },
  [31]: (state: AppState) => {
    const messages = state.messageStore.messages;
    const operations: $ReadOnlyArray<ClientDBMessageStoreOperation> = [
      {
        type: 'remove_all',
      },
      ...Object.keys(messages).map((id: string) => ({
        type: 'replace',
        payload: translateRawMessageInfoToClientDBMessageInfo(messages[id]),
      })),
    ];
    const processingResult: boolean = global.CommCoreModule.processMessageStoreOperationsSync(
      operations,
    );
    if (!processingResult) {
      return { ...state, cookie: null };
    }
    return state;
  },
};

// After migration 31, we'll no longer want to persist `messageStore.messages`
// via redux-persist. However, we DO want to continue persisting everything in
// `messageStore` EXCEPT for `messages`. The `blacklist` property in
// `persistConfig` allows us to specify top-level keys that shouldn't be
// persisted. However, we aren't able to specify nested keys in `blacklist`.
// As a result, if we want to prevent nested keys from being persisted we'll
// need to use `createTransform(...)` to specify an `inbound` function that
// allows us to modify the `state` object before it's passed through
// `JSON.stringify(...)` and written to disk. We specify the keys for which
// this transformation should be executed in the `whitelist` property of the
// `config` object that's passed to `createTransform(...)`.
// eslint-disable-next-line no-unused-vars
const messageStoreMessagesBlocklistTransform: Transform = createTransform(
  state => {
    const { messages, threads, ...messageStoreSansMessages } = state;
    // We also do not want to persist `messageStore.threads[ID].messageIDs`
    // because they can be deterministically computed based on messages we have
    // from SQLite
    const threadsToPersist = {};
    for (const threadID in threads) {
      const { messageIDs, ...threadsData } = threads[threadID];
      threadsToPersist[threadID] = threadsData;
    }
    return { ...messageStoreSansMessages, threads: threadsToPersist };
  },
  state => {
    const { threads, ...messageStore } = state;
    for (const threadID in threads) {
      threads[threadID].messageIDs = [];
    }
    return { ...messageStore, threads };
  },
  { whitelist: ['messageStore'] },
);

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: [
    'loadingStatuses',
    'lifecycleState',
    'dimensions',
    'connectivity',
    'deviceOrientation',
    'frozen',
    'threadStore',
  ],
  debug: __DEV__,
  version: 31,
  transforms: [messageStoreMessagesBlocklistTransform],
  migrate: (createMigrate(migrations, { debug: __DEV__ }): any),
  timeout: ((__DEV__ ? 0 : undefined): number | void),
};

const codeVersion: number = global.CommCoreModule.getCodeVersion();

// This local exists to avoid a circular dependency where redux-setup needs to
// import all the navigation and screen stuff, but some of those screens want to
// access the persistor to purge its state.
let storedPersistor = null;
function setPersistor(persistor: *) {
  storedPersistor = persistor;
}
function getPersistor(): empty {
  invariant(storedPersistor, 'should be set');
  return storedPersistor;
}

export { persistConfig, codeVersion, setPersistor, getPersistor };
