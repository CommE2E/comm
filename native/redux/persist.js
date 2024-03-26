// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import invariant from 'invariant';
import { Platform } from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { createTransform } from 'redux-persist';
import type { Transform } from 'redux-persist/es/types.js';

import {
  convertEntryStoreToNewIDSchema,
  convertInviteLinksStoreToNewIDSchema,
  convertMessageStoreToNewIDSchema,
  convertRawMessageInfoToNewIDSchema,
  convertCalendarFilterToNewIDSchema,
  convertConnectionInfoToNewIDSchema,
} from 'lib/_generated/migration-utils.js';
import { extractKeyserverIDFromID } from 'lib/keyserver-conn/keyserver-call-utils.js';
import {
  type ClientDBIntegrityStoreOperation,
  integrityStoreOpsHandlers,
  type ReplaceIntegrityThreadHashesOperation,
} from 'lib/ops/integrity-store-ops.js';
import {
  type ClientDBKeyserverStoreOperation,
  keyserverStoreOpsHandlers,
  type ReplaceKeyserverOperation,
} from 'lib/ops/keyserver-store-ops.js';
import {
  type ClientDBMessageStoreOperation,
  messageStoreOpsHandlers,
} from 'lib/ops/message-store-ops.js';
import {
  type ReportStoreOperation,
  type ClientDBReportStoreOperation,
  convertReportsToReplaceReportOps,
  reportStoreOpsHandlers,
} from 'lib/ops/report-store-ops.js';
import type { ClientDBThreadStoreOperation } from 'lib/ops/thread-store-ops.js';
import { threadStoreOpsHandlers } from 'lib/ops/thread-store-ops.js';
import {
  type ClientDBUserStoreOperation,
  type UserStoreOperation,
  convertUserInfosToReplaceUserOps,
  userStoreOpsHandlers,
} from 'lib/ops/user-store-ops.js';
import { patchRawThreadInfosWithSpecialRole } from 'lib/permissions/special-roles.js';
import { filterThreadIDsInFilterList } from 'lib/reducers/calendar-filters-reducer.js';
import { highestLocalIDSelector } from 'lib/selectors/local-id-selectors.js';
import { createAsyncMigrate } from 'lib/shared/create-async-migrate.js';
import { inconsistencyResponsesToReports } from 'lib/shared/report-utils.js';
import {
  getContainingThreadID,
  getCommunity,
  assertAllThreadInfosAreLegacy,
} from 'lib/shared/thread-utils.js';
import { keyserverStoreTransform } from 'lib/shared/transforms/keyserver-store-transform.js';
import {
  DEPRECATED_unshimMessageStore,
  unshimFunc,
} from 'lib/shared/unshim-utils.js';
import { defaultEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarQuery } from 'lib/types/entry-types.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import {
  messageTypes,
  type MessageType,
} from 'lib/types/message-types-enum.js';
import {
  type LocalMessageInfo,
  type MessageStore,
  type MessageStoreThreads,
  type RawMessageInfo,
} from 'lib/types/message-types.js';
import { minimallyEncodeRawThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { RawThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type {
  ReportStore,
  ClientReportCreationRequest,
} from 'lib/types/report-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';
import type {
  ClientDBThreadInfo,
  LegacyRawThreadInfo,
  MixedRawThreadInfos,
} from 'lib/types/thread-types.js';
import { wipeKeyserverStore } from 'lib/utils/keyserver-store-utils.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateRawMessageInfoToClientDBMessageInfo,
} from 'lib/utils/message-ops-utils.js';
import {
  generateIDSchemaMigrationOpsForDrafts,
  convertMessageStoreThreadsToNewIDSchema,
  convertThreadStoreThreadInfosToNewIDSchema,
} from 'lib/utils/migration-utils.js';
import { entries } from 'lib/utils/objects.js';
import { defaultNotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
import { resetUserSpecificState } from 'lib/utils/reducers-utils.js';
import {
  deprecatedConvertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from 'lib/utils/thread-ops-utils.js';
import { getUUID } from 'lib/utils/uuid.js';

import {
  createUpdateDBOpsForMessageStoreMessages,
  createUpdateDBOpsForMessageStoreThreads,
  updateClientDBThreadStoreThreadInfos,
} from './client-db-utils.js';
import { defaultState } from './default-state.js';
import {
  deprecatedCreateUpdateDBOpsForThreadStoreThreadInfos,
  deprecatedUpdateClientDBThreadStoreThreadInfos,
} from './deprecated-client-db-utils.js';
import { migrateThreadStoreForEditThreadPermissions } from './edit-thread-permission-migration.js';
import { legacyUpdateRolesAndPermissions } from './legacy-update-roles-and-permissions.js';
import { persistMigrationForManagePinsThreadPermission } from './manage-pins-permission-migration.js';
import { persistMigrationToRemoveSelectRolePermissions } from './remove-select-role-permissions.js';
import type { AppState } from './state-types.js';
import { nonUserSpecificFieldsNative } from './state-types.js';
import { unshimClientDB } from './unshim-utils.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import { commCoreModule } from '../native-modules.js';
import { defaultDeviceCameraInfo } from '../types/camera.js';
import { isTaskCancelledError } from '../utils/error-handling.js';
import { defaultURLPrefix } from '../utils/url-utils.js';

const persistBlacklist = [
  'loadingStatuses',
  'lifecycleState',
  'dimensions',
  'draftStore',
  'connectivity',
  'deviceOrientation',
  'frozen',
  'threadStore',
  'storeLoaded',
];

function handleReduxMigrationFailure(oldState: AppState): AppState {
  const persistedNonUserSpecificFields = nonUserSpecificFieldsNative.filter(
    field => !persistBlacklist.includes(field) || field === '_persist',
  );
  const stateAfterReset = resetUserSpecificState(
    oldState,
    defaultState,
    persistedNonUserSpecificFields,
  );
  return {
    ...stateAfterReset,
    keyserverStore: wipeKeyserverStore(stateAfterReset.keyserverStore),
  };
}

const migrations = {
  [1]: (state: AppState) => ({
    ...state,
    notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
  }),
  [2]: (state: AppState) => ({
    ...state,
    messageSentFromRoute: [],
  }),
  [3]: (state: any) => ({
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
  [6]: (state: any) => ({
    ...state,
    threadInfos: undefined,
    threadStore: {
      threadInfos: state.threadInfos,
      inconsistencyResponses: [],
    },
  }),
  [7]: (state: AppState) => ({
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
    connection: {
      ...defaultConnectionInfo,
      actualizedCalendarQuery: defaultCalendarQuery(Platform.OS),
    },
    watchedThreadIDs: [],
    entryStore: {
      ...state.entryStore,
      actualizedCalendarQuery: undefined,
    },
  }),
  [9]: (state: any) => ({
    ...state,
    connection: {
      ...state.connection,
      lateResponses: [],
    },
  }),
  [10]: (state: any) => ({
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
  [15]: (state: any) => ({
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
  [16]: (state: any) => {
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
  [17]: (state: any) => ({
    ...state,
    userInfos: undefined,
    userStore: {
      userInfos: state.userInfos,
      inconsistencyResponses: [],
    },
  }),
  [18]: (state: AppState) => ({
    ...state,
    userStore: {
      userInfos: state.userStore.userInfos,
      inconsistencyReports: [],
    },
  }),
  [19]: (state: any) => {
    const threadInfos: { [string]: LegacyRawThreadInfo } = {};
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
      messageTypes.LEGACY_UPDATE_RELATIONSHIP,
    ]),
  }),
  [21]: (state: AppState) => ({
    ...state,
    messageStore: DEPRECATED_unshimMessageStore(state.messageStore, [
      messageTypes.CREATE_SIDEBAR,
      messageTypes.SIDEBAR_SOURCE,
    ]),
  }),
  [22]: (state: any) => {
    for (const key in state.drafts) {
      const value = state.drafts[key];
      try {
        void commCoreModule.updateDraft(key, value);
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
  [23]: (state: AppState) => ({
    ...state,
    globalThemeInfo: defaultGlobalThemeInfo,
  }),
  [24]: (state: AppState) => ({
    ...state,
    enabledApps: defaultEnabledApps,
  }),
  [25]: (state: AppState) => ({
    ...state,
    crashReportsEnabled: __DEV__,
  }),
  [26]: (state: any) => {
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
  [27]: (state: any) => ({
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
  [28]: (state: AppState) => {
    const threadParentToChildren: { [string]: string[] } = {};
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

    const threadInfos: {
      [string]: LegacyRawThreadInfo | RawThreadInfo,
    } = {};
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
    const legacyRawThreadInfos: {
      +[id: string]: LegacyRawThreadInfo,
    } = assertAllThreadInfosAreLegacy(state.threadStore.threadInfos);

    const updatedThreadInfos =
      migrateThreadStoreForEditThreadPermissions(legacyRawThreadInfos);

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
        threadStoreOpsHandlers.convertOpsToClientDBOps(operations),
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
  [34]: (state: any) => {
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
      deprecatedConvertClientDBThreadInfoToRawThreadInfo,
    );
    const rawMessageInfos = clientDBMessageInfos.map(
      translateClientDBMessageInfoToRawMessageInfo,
    );

    // 3. Unshim translated `RawMessageInfos` to get the TOGGLE_PIN messages
    const unshimmedRawMessageInfos = rawMessageInfos.map(messageInfo =>
      unshimFunc(messageInfo, new Set<MessageType>([messageTypes.TOGGLE_PIN])),
    );

    // 4. Filter out non-TOGGLE_PIN messages
    const filteredRawMessageInfos = unshimmedRawMessageInfos
      .map(messageInfo =>
        messageInfo.type === messageTypes.TOGGLE_PIN ? messageInfo : null,
      )
      .filter(Boolean);

    // 5. We want only the last TOGGLE_PIN message for each message ID,
    // so 'pin', 'unpin', 'pin' don't count as 3 pins, but only 1.
    const lastMessageIDToRawMessageInfoMap = new Map<string, RawMessageInfo>();
    for (const messageInfo of filteredRawMessageInfos) {
      const { targetMessageID } = messageInfo;
      lastMessageIDToRawMessageInfoMap.set(targetMessageID, messageInfo);
    }
    const lastMessageIDToRawMessageInfos = Array.from(
      lastMessageIDToRawMessageInfoMap.values(),
    );

    // 6. Create a Map of threadIDs to pinnedCount
    const threadIDsToPinnedCount = new Map<string, number>();
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
      (
        acc: { [string]: LegacyRawThreadInfo },
        threadInfo: LegacyRawThreadInfo,
      ) => {
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
  [37]: (state: AppState) => {
    const operations = messageStoreOpsHandlers.convertOpsToClientDBOps([
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
  [38]: (state: AppState) =>
    deprecatedUpdateClientDBThreadStoreThreadInfos(
      state,
      legacyUpdateRolesAndPermissions,
    ),
  [39]: (state: AppState) => unshimClientDB(state, [messageTypes.EDIT_MESSAGE]),
  [40]: (state: AppState) =>
    deprecatedUpdateClientDBThreadStoreThreadInfos(
      state,
      legacyUpdateRolesAndPermissions,
    ),
  [41]: (state: AppState) => {
    const queuedReports = state.reportStore.queuedReports.map(report => ({
      ...report,
      id: getUUID(),
    }));
    return {
      ...state,
      reportStore: { ...state.reportStore, queuedReports },
    };
  },
  [42]: (state: AppState) => {
    const reportStoreOperations: $ReadOnlyArray<ReportStoreOperation> = [
      { type: 'remove_all_reports' },
      ...convertReportsToReplaceReportOps(state.reportStore.queuedReports),
    ];
    const dbOperations: $ReadOnlyArray<ClientDBReportStoreOperation> =
      reportStoreOpsHandlers.convertOpsToClientDBOps(reportStoreOperations);

    try {
      commCoreModule.processReportStoreOperationsSync(dbOperations);
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return { ...state, cookie: null };
    }
    return state;
  },
  [43]: async (state: any) => {
    const { messages, drafts, threads, messageStoreThreads } =
      await commCoreModule.getClientDBStore();

    const messageStoreThreadsOperations =
      createUpdateDBOpsForMessageStoreThreads(
        messageStoreThreads,
        convertMessageStoreThreadsToNewIDSchema,
      );

    const messageStoreMessagesOperations =
      createUpdateDBOpsForMessageStoreMessages(messages, messageInfos =>
        messageInfos.map(convertRawMessageInfoToNewIDSchema),
      );

    const threadOperations =
      deprecatedCreateUpdateDBOpsForThreadStoreThreadInfos(
        threads,
        convertThreadStoreThreadInfosToNewIDSchema,
      );

    const draftOperations = generateIDSchemaMigrationOpsForDrafts(drafts);

    try {
      await Promise.all([
        commCoreModule.processMessageStoreOperations([
          ...messageStoreMessagesOperations,
          ...messageStoreThreadsOperations,
        ]),
        commCoreModule.processThreadStoreOperations(threadOperations),
        commCoreModule.processDraftStoreOperations(draftOperations),
      ]);
    } catch (exception) {
      console.log(exception);
      return { ...state, cookie: null };
    }

    const inviteLinksStore =
      state.inviteLinksStore ?? defaultState.inviteLinksStore;

    return {
      ...state,
      entryStore: convertEntryStoreToNewIDSchema(state.entryStore),
      messageStore: convertMessageStoreToNewIDSchema(state.messageStore),
      calendarFilters: state.calendarFilters.map(
        convertCalendarFilterToNewIDSchema,
      ),
      connection: convertConnectionInfoToNewIDSchema(state.connection),
      watchedThreadIDs: state.watchedThreadIDs.map(
        id => `${authoritativeKeyserverID}|${id}`,
      ),
      inviteLinksStore: convertInviteLinksStoreToNewIDSchema(inviteLinksStore),
    };
  },
  [44]: async (state: any) => {
    const { cookie, ...rest } = state;

    return {
      ...rest,
      keyserverStore: {
        keyserverInfos: { [authoritativeKeyserverID]: { cookie } },
      },
    };
  },
  [45]: async (state: any) => {
    const { updatesCurrentAsOf, keyserverStore, ...rest } = state;

    return {
      ...rest,
      keyserverStore: {
        ...keyserverStore,
        keyserverInfos: {
          ...keyserverStore.keyserverInfos,
          [authoritativeKeyserverID]: {
            ...keyserverStore.keyserverInfos[authoritativeKeyserverID],
            updatesCurrentAsOf,
          },
        },
      },
    };
  },
  [46]: async (state: AppState) => {
    const { currentAsOf } = state.messageStore;

    return {
      ...state,
      messageStore: {
        ...state.messageStore,
        currentAsOf: { [authoritativeKeyserverID]: currentAsOf },
      },
    };
  },
  [47]: async (state: any) => {
    const { urlPrefix, keyserverStore, ...rest } = state;

    return {
      ...rest,
      keyserverStore: {
        ...keyserverStore,
        keyserverInfos: {
          ...keyserverStore.keyserverInfos,
          [authoritativeKeyserverID]: {
            ...keyserverStore.keyserverInfos[authoritativeKeyserverID],
            urlPrefix,
          },
        },
      },
    };
  },
  [48]: async (state: any) => {
    const { connection, keyserverStore, ...rest } = state;

    return {
      ...rest,
      keyserverStore: {
        ...keyserverStore,
        keyserverInfos: {
          ...keyserverStore.keyserverInfos,
          [authoritativeKeyserverID]: {
            ...keyserverStore.keyserverInfos[authoritativeKeyserverID],
            connection,
          },
        },
      },
    };
  },
  [49]: async (state: AppState) => {
    const { keyserverStore, ...rest } = state;

    const { connection, ...keyserverRest } =
      keyserverStore.keyserverInfos[authoritativeKeyserverID];

    return {
      ...rest,
      keyserverStore: {
        ...keyserverStore,
        keyserverInfos: {
          ...keyserverStore.keyserverInfos,
          [authoritativeKeyserverID]: {
            ...keyserverRest,
          },
        },
      },
      connection,
    };
  },
  [50]: async (state: any) => {
    const { connection, ...rest } = state;
    const { actualizedCalendarQuery, ...connectionRest } = connection;

    return {
      ...rest,
      connection: connectionRest,
      actualizedCalendarQuery,
    };
  },
  [51]: async (state: any) => {
    const { lastCommunicatedPlatformDetails, keyserverStore, ...rest } = state;

    return {
      ...rest,
      keyserverStore: {
        ...keyserverStore,
        keyserverInfos: {
          ...keyserverStore.keyserverInfos,
          [authoritativeKeyserverID]: {
            ...keyserverStore.keyserverInfos[authoritativeKeyserverID],
            lastCommunicatedPlatformDetails,
          },
        },
      },
    };
  },
  [52]: async (state: AppState) => ({
    ...state,
    integrityStore: {
      threadHashes: {},
      threadHashingStatus: 'data_not_loaded',
    },
  }),
  [53]: (state: any) => {
    if (!state.userStore.inconsistencyReports) {
      return state;
    }
    const reportStoreOperations = convertReportsToReplaceReportOps(
      state.userStore.inconsistencyReports,
    );
    const dbOperations: $ReadOnlyArray<ClientDBReportStoreOperation> =
      reportStoreOpsHandlers.convertOpsToClientDBOps(reportStoreOperations);
    try {
      commCoreModule.processReportStoreOperationsSync(dbOperations);
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return handleReduxMigrationFailure(state);
    }

    const { inconsistencyReports, ...newUserStore } = state.userStore;
    const queuedReports = reportStoreOpsHandlers.processStoreOperations(
      state.reportStore.queuedReports,
      reportStoreOperations,
    );
    return {
      ...state,
      userStore: newUserStore,
      reportStore: {
        ...state.reportStore,
        queuedReports,
      },
    };
  },
  [54]: (state: any) => {
    let updatedMessageStoreThreads: MessageStoreThreads = {};
    for (const threadID: string in state.messageStore.threads) {
      const { lastNavigatedTo, lastPruned, ...rest } =
        state.messageStore.threads[threadID];

      updatedMessageStoreThreads = {
        ...updatedMessageStoreThreads,
        [threadID]: rest,
      };
    }

    return {
      ...state,
      messageStore: {
        ...state.messageStore,
        threads: updatedMessageStoreThreads,
      },
    };
  },
  [55]: async (state: AppState) =>
    __DEV__
      ? {
          ...state,
          keyserverStore: {
            ...state.keyserverStore,
            keyserverInfos: {
              ...state.keyserverStore.keyserverInfos,
              [authoritativeKeyserverID]: {
                ...state.keyserverStore.keyserverInfos[
                  authoritativeKeyserverID
                ],
                urlPrefix: defaultURLPrefix,
              },
            },
          },
        }
      : state,
  [56]: (state: any) => {
    const { deviceToken, keyserverStore, ...rest } = state;

    return {
      ...rest,
      keyserverStore: {
        ...keyserverStore,
        keyserverInfos: {
          ...keyserverStore.keyserverInfos,
          [authoritativeKeyserverID]: {
            ...keyserverStore.keyserverInfos[authoritativeKeyserverID],
            deviceToken,
          },
        },
      },
    };
  },
  [57]: async (state: any) => {
    const {
      connection,
      keyserverStore: { keyserverInfos },
      ...rest
    } = state;
    const newKeyserverInfos: { [string]: KeyserverInfo } = {};
    for (const key in keyserverInfos) {
      newKeyserverInfos[key] = {
        ...keyserverInfos[key],
        connection: { ...defaultConnectionInfo },
      };
    }
    return {
      ...rest,
      keyserverStore: {
        ...state.keyserverStore,
        keyserverInfos: newKeyserverInfos,
      },
    };
  },
  [58]: async (state: AppState) => {
    const userStoreOperations: $ReadOnlyArray<UserStoreOperation> = [
      { type: 'remove_all_users' },
      ...convertUserInfosToReplaceUserOps(state.userStore.userInfos),
    ];
    const dbOperations: $ReadOnlyArray<ClientDBUserStoreOperation> =
      userStoreOpsHandlers.convertOpsToClientDBOps(userStoreOperations);

    try {
      await commCoreModule.processUserStoreOperations(dbOperations);
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return handleReduxMigrationFailure(state);
    }
    return state;
  },
  [59]: (state: AppState) => {
    const clientDBThreadInfos = commCoreModule.getAllThreadsSync();
    const rawThreadInfos = clientDBThreadInfos.map(
      deprecatedConvertClientDBThreadInfoToRawThreadInfo,
    );
    const rawThreadInfosObject = rawThreadInfos.reduce(
      (
        acc: { [string]: LegacyRawThreadInfo },
        threadInfo: LegacyRawThreadInfo,
      ) => {
        acc[threadInfo.id] = threadInfo;
        return acc;
      },
      {},
    );

    const migratedRawThreadInfos =
      persistMigrationToRemoveSelectRolePermissions(rawThreadInfosObject);

    const migratedThreadInfosArray = Object.keys(migratedRawThreadInfos).map(
      id => migratedRawThreadInfos[id],
    );
    const convertedClientDBThreadInfos = migratedThreadInfosArray.map(
      convertRawThreadInfoToClientDBThreadInfo,
    );
    const operations: $ReadOnlyArray<ClientDBThreadStoreOperation> = [
      {
        type: 'remove_all',
      },
      ...convertedClientDBThreadInfos.map((thread: ClientDBThreadInfo) => ({
        type: 'replace',
        payload: thread,
      })),
    ];

    try {
      commCoreModule.processThreadStoreOperationsSync(operations);
    } catch (exception) {
      console.log(exception);
      return handleReduxMigrationFailure(state);
    }

    return state;
  },
  [60]: (state: AppState) =>
    deprecatedUpdateClientDBThreadStoreThreadInfos(
      state,
      legacyUpdateRolesAndPermissions,
      handleReduxMigrationFailure,
    ),
  [61]: (state: AppState) => {
    const minimallyEncodeThreadInfosFunc = (
      threadStoreInfos: MixedRawThreadInfos,
    ): MixedRawThreadInfos =>
      Object.keys(threadStoreInfos).reduce(
        (
          acc: {
            [string]: LegacyRawThreadInfo | RawThreadInfo,
          },
          key: string,
        ) => {
          const threadInfo = threadStoreInfos[key];
          acc[threadInfo.id] = threadInfo.minimallyEncoded
            ? threadInfo
            : minimallyEncodeRawThreadInfo(threadInfo);
          return acc;
        },
        {},
      );
    return deprecatedUpdateClientDBThreadStoreThreadInfos(
      state,
      minimallyEncodeThreadInfosFunc,
      handleReduxMigrationFailure,
    );
  },
  [62]: async (state: AppState) => {
    const replaceOps: $ReadOnlyArray<ReplaceKeyserverOperation> = entries(
      state.keyserverStore.keyserverInfos,
    ).map(([id, keyserverInfo]) => ({
      type: 'replace_keyserver',
      payload: {
        id,
        keyserverInfo,
      },
    }));

    const dbOperations: $ReadOnlyArray<ClientDBKeyserverStoreOperation> =
      keyserverStoreOpsHandlers.convertOpsToClientDBOps([
        { type: 'remove_all_keyservers' },
        ...replaceOps,
      ]);

    try {
      await commCoreModule.processKeyserverStoreOperations(dbOperations);
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return handleReduxMigrationFailure(state);
    }
    return state;
  },
  [63]: async (state: any) => {
    const { actualizedCalendarQuery, ...rest } = state;
    const operations: $ReadOnlyArray<ReplaceKeyserverOperation> = entries(
      state.keyserverStore.keyserverInfos,
    ).map(([id, keyserverInfo]) => ({
      type: 'replace_keyserver',
      payload: {
        id,
        keyserverInfo: {
          ...keyserverInfo,
          actualizedCalendarQuery: {
            ...actualizedCalendarQuery,
            filters: filterThreadIDsInFilterList(
              actualizedCalendarQuery.filters,
              (threadID: string) => extractKeyserverIDFromID(threadID) === id,
            ),
          },
        },
      },
    }));
    const dbOperations: $ReadOnlyArray<ClientDBKeyserverStoreOperation> =
      keyserverStoreOpsHandlers.convertOpsToClientDBOps(operations);

    const newState = {
      ...rest,
      keyserverStore: keyserverStoreOpsHandlers.processStoreOperations(
        rest.keyserverStore,
        operations,
      ),
    };
    try {
      await commCoreModule.processKeyserverStoreOperations(dbOperations);
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return newState;
      }
      return handleReduxMigrationFailure(newState);
    }
    return newState;
  },
  [64]: (state: AppState) =>
    updateClientDBThreadStoreThreadInfos(
      state,
      patchRawThreadInfosWithSpecialRole,
      handleReduxMigrationFailure,
    ),
  [65]: async (state: AppState) => {
    const replaceOp: ReplaceIntegrityThreadHashesOperation = {
      type: 'replace_integrity_thread_hashes',
      payload: {
        threadHashes: state.integrityStore.threadHashes,
      },
    };

    const dbOperations: $ReadOnlyArray<ClientDBIntegrityStoreOperation> =
      integrityStoreOpsHandlers.convertOpsToClientDBOps([
        { type: 'remove_all_integrity_thread_hashes' },
        replaceOp,
      ]);

    try {
      await commCoreModule.processIntegrityStoreOperations(dbOperations);
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return handleReduxMigrationFailure(state);
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
type PersistedMessageStore = {
  +local: { +[id: string]: LocalMessageInfo },
  +currentAsOf: { +[keyserverID: string]: number },
};
const messageStoreMessagesBlocklistTransform: Transform = createTransform(
  (state: MessageStore): PersistedMessageStore => {
    const { messages, threads, ...messageStoreSansMessages } = state;
    return { ...messageStoreSansMessages };
  },
  (state: MessageStore): MessageStore => {
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
    return {
      ...state,
      threads: state.threads ?? {},
      messages: state.messages ?? {},
    };
  },
  { whitelist: ['messageStore'] },
);

type PersistedReportStore = $Diff<
  ReportStore,
  { +queuedReports: $ReadOnlyArray<ClientReportCreationRequest> },
>;
const reportStoreTransform: Transform = createTransform(
  (state: ReportStore): PersistedReportStore => {
    return { enabledReports: state.enabledReports };
  },
  (state: PersistedReportStore): ReportStore => {
    return { ...state, queuedReports: [] };
  },
  { whitelist: ['reportStore'] },
);

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: persistBlacklist,
  debug: __DEV__,
  version: 65,
  transforms: [
    messageStoreMessagesBlocklistTransform,
    reportStoreTransform,
    keyserverStoreTransform,
  ],
  migrate: (createAsyncMigrate(migrations, { debug: __DEV__ }): any),
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
