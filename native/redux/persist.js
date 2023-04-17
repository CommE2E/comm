// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import invariant from 'invariant';
import { Platform } from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { createMigrate, createTransform } from 'redux-persist';
import type { Transform } from 'redux-persist/es/types.js';

import { highestLocalIDSelector } from 'lib/selectors/local-id-selectors.js';
import { inconsistencyResponsesToReports } from 'lib/shared/report-utils.js';
import {
  getContainingThreadID,
  getCommunity,
} from 'lib/shared/thread-utils.js';
import {
  DEPRECATED_unshimMessageStore,
  unshimFunc,
} from 'lib/shared/unshim-utils.js';
import { defaultEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import {
  type LocalMessageInfo,
  type MessageStore,
  messageTypes,
  type ClientDBMessageStoreOperation,
} from 'lib/types/message-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import type {
  ClientDBThreadStoreOperation,
  ClientDBThreadInfo,
} from 'lib/types/thread-types.js';
import {
  convertMessageStoreOperationsToClientDBOperations,
  translateClientDBMessageInfoToRawMessageInfo,
  translateRawMessageInfoToClientDBMessageInfo,
} from 'lib/utils/message-ops-utils.js';
import { defaultNotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
  convertThreadStoreOperationsToClientDBOperations,
} from 'lib/utils/thread-ops-utils.js';

import { migrateThreadStoreForEditThreadPermissions } from './edit-thread-permission-migration.js';
import { persistMigrationForManagePinsThreadPermission } from './manage-pins-permission-migration.js';
import type { AppState } from './state-types.js';
import { unshimClientDB } from './unshim-utils.js';
import { commCoreModule } from '../native-modules.js';
import { defaultDeviceCameraInfo } from '../types/camera.js';
import { defaultGlobalThemeInfo } from '../types/themes.js';
import { isTaskCancelledError } from '../utils/error-handling.js';

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
    messageStore: DEPRECATED_unshimMessageStore(state.messageStore, [
      messageTypes.IMAGES,
    ]),
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
    messageStore: DEPRECATED_unshimMessageStore(state.messageStore, [
      messageTypes.UPDATE_RELATIONSHIP,
    ]),
  }),
  [21]: (state: AppState) => ({
    ...state,
    messageStore: DEPRECATED_unshimMessageStore(state.messageStore, [
      messageTypes.CREATE_SIDEBAR,
      messageTypes.SIDEBAR_SOURCE,
    ]),
  }),
  [22]: state => {
    for (const key in state.drafts) {
      const value = state.drafts[key];
      try {
        commCoreModule.updateDraft(key, value);
      } catch (e) {
        if (!isTaskCancelledError(e)) {
          throw e;
        }
      }
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
    try {
      commCoreModule.processThreadStoreOperationsSync(
        convertThreadStoreOperationsToClientDBOperations(operations),
      );
    } catch (exception) {
      console.log(exception);
      if (isTaskCancelledError(exception)) {
        return state;
      }
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
    try {
      commCoreModule.processMessageStoreOperationsSync(operations);
    } catch (exception) {
      console.log(exception);
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return { ...state, cookie: null };
    }
    return state;
  },
  [32]: (state: AppState) => unshimClientDB(state, [messageTypes.MULTIMEDIA]),
  [33]: (state: AppState) => unshimClientDB(state, [messageTypes.REACTION]),
  [34]: state => {
    const { threadIDsToNotifIDs, ...stateSansThreadIDsToNotifIDs } = state;
    return stateSansThreadIDsToNotifIDs;
  },
  [35]: (state: AppState) => unshimClientDB(state, [messageTypes.MULTIMEDIA]),
  [36]: (state: AppState) => {
    // 1. Get threads and messages from SQLite `threads` and `messages` tables.
    const clientDBThreadInfos = commCoreModule.getAllThreadsSync();
    const clientDBMessageInfos = commCoreModule.getAllMessagesSync();

    // 2. Translate `ClientDBThreadInfo`s to `RawThreadInfo`s and
    //    `ClientDBMessageInfo`s to `RawMessageInfo`s.
    const rawThreadInfos = clientDBThreadInfos.map(
      convertClientDBThreadInfoToRawThreadInfo,
    );
    const rawMessageInfos = clientDBMessageInfos.map(
      translateClientDBMessageInfoToRawMessageInfo,
    );

    // 3. Unshim translated `RawMessageInfos` to get the TOGGLE_PIN messages
    const unshimmedRawMessageInfos = rawMessageInfos.map(messageInfo =>
      unshimFunc(messageInfo, new Set([messageTypes.TOGGLE_PIN])),
    );

    // 4. Filter out non-TOGGLE_PIN messages
    const filteredRawMessageInfos = unshimmedRawMessageInfos.filter(
      messageInfo => messageInfo.type === messageTypes.TOGGLE_PIN,
    );

    // 5. We want only the last TOGGLE_PIN message for each message ID,
    // so 'pin', 'unpin', 'pin' don't count as 3 pins, but only 1.
    const lastMessageIDToRawMessageInfoMap = new Map();
    for (const messageInfo of filteredRawMessageInfos) {
      const { targetMessageID } = messageInfo;
      lastMessageIDToRawMessageInfoMap.set(targetMessageID, messageInfo);
    }
    const lastMessageIDToRawMessageInfos = Array.from(
      lastMessageIDToRawMessageInfoMap.values(),
    );

    // 6. Create a Map of threadIDs to pinnedCount
    const threadIDsToPinnedCount = new Map();
    for (const messageInfo of lastMessageIDToRawMessageInfos) {
      const { threadID, type } = messageInfo;
      if (type === messageTypes.TOGGLE_PIN) {
        const pinnedCount = threadIDsToPinnedCount.get(threadID) || 0;
        threadIDsToPinnedCount.set(threadID, pinnedCount + 1);
      }
    }

    // 7. Include a pinnedCount for each rawThreadInfo
    const rawThreadInfosWithPinnedCount = rawThreadInfos.map(threadInfo => ({
      ...threadInfo,
      pinnedCount: threadIDsToPinnedCount.get(threadInfo.id) || 0,
    }));

    // 8. Convert rawThreadInfos to a map of threadID to threadInfo
    const threadIDToThreadInfo = rawThreadInfosWithPinnedCount.reduce(
      (acc, threadInfo) => {
        acc[threadInfo.id] = threadInfo;
        return acc;
      },
      {},
    );

    // 9. Add threadPermission to each threadInfo
    const rawThreadInfosWithThreadPermission =
      persistMigrationForManagePinsThreadPermission(threadIDToThreadInfo);

    // 10. Convert the new threadInfos back into an array
    const rawThreadInfosWithCountAndPermission = Object.keys(
      rawThreadInfosWithThreadPermission,
    ).map(id => rawThreadInfosWithThreadPermission[id]);

    // 11. Translate `RawThreadInfo`s to `ClientDBThreadInfo`s.
    const convertedClientDBThreadInfos =
      rawThreadInfosWithCountAndPermission.map(
        convertRawThreadInfoToClientDBThreadInfo,
      );

    // 12. Construct `ClientDBThreadStoreOperation`s to clear SQLite `threads`
    //    table and repopulate with `ClientDBThreadInfo`s.
    const operations: $ReadOnlyArray<ClientDBThreadStoreOperation> = [
      {
        type: 'remove_all',
      },
      ...convertedClientDBThreadInfos.map((thread: ClientDBThreadInfo) => ({
        type: 'replace',
        payload: thread,
      })),
    ];

    // 13. Try processing `ClientDBThreadStoreOperation`s and log out if
    //    `processThreadStoreOperationsSync(...)` throws an exception.
    try {
      commCoreModule.processThreadStoreOperationsSync(operations);
    } catch (exception) {
      console.log(exception);
      return { ...state, cookie: null };
    }

    return state;
  },
  [37]: state => {
    const operations = convertMessageStoreOperationsToClientDBOperations([
      {
        type: 'remove_all_threads',
      },
      {
        type: 'replace_threads',
        payload: { threads: state.messageStore.threads },
      },
    ]);

    try {
      commCoreModule.processMessageStoreOperationsSync(operations);
    } catch (exception) {
      console.error(exception);
      if (isTaskCancelledError(exception)) {
        return state;
      }
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
type PersistedThreadMessageInfo = {
  +startReached: boolean,
  +lastNavigatedTo: number,
  +lastPruned: number,
};
type PersistedMessageStore = {
  +local: { +[id: string]: LocalMessageInfo },
  +currentAsOf: number,
  +threads: { +[threadID: string]: PersistedThreadMessageInfo },
};

const messageStoreMessagesBlocklistTransform: Transform = createTransform(
  (state: MessageStore): PersistedMessageStore => {
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
  (state: MessageStore): MessageStore => {
    const { threads: persistedThreads, ...messageStore } = state;
    const threads = {};
    for (const threadID in persistedThreads) {
      threads[threadID] = { ...persistedThreads[threadID], messageIDs: [] };
    }
    // We typically expect `messageStore.messages` to be `undefined` because
    // messages are persisted in the SQLite `messages` table rather than via
    // `redux-persist`. In this case we want to set `messageStore.messages`
    // to {} so we don't run into issues with `messageStore.messages` being
    // `undefined` (https://phab.comm.dev/D5545).
    //
    // However, in the case that a user is upgrading from a client where
    // `persistConfig.version` < 31, we expect `messageStore.messages` to
    // contain messages stored via `redux-persist` that we need in order
    // to correctly populate the SQLite `messages` table in migration 31
    // (https://phab.comm.dev/D2600).
    //
    // However, because `messageStoreMessagesBlocklistTransform` modifies
    // `messageStore` before migrations are run, we need to make sure we aren't
    // inadvertently clearing `messageStore.messages` (by setting to {}) before
    // messages are stored in SQLite (https://linear.app/comm/issue/ENG-2377).
    return { ...messageStore, threads, messages: messageStore.messages ?? {} };
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
    'draftStore',
    'connectivity',
    'deviceOrientation',
    'frozen',
    'threadStore',
    'storeLoaded',
  ],
  debug: __DEV__,
  version: 37,
  transforms: [messageStoreMessagesBlocklistTransform],
  migrate: (createMigrate(migrations, { debug: __DEV__ }): any),
  timeout: ((__DEV__ ? 0 : undefined): number | void),
};

const codeVersion: number = commCoreModule.getCodeVersion();

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
