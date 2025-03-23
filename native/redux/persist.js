// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import invariant from 'invariant';
import { Platform } from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { createTransform } from 'redux-persist';
import type { Transform, Persistor } from 'redux-persist/es/types.js';

import {
  convertEntryStoreToNewIDSchema,
  convertInviteLinksStoreToNewIDSchema,
  convertMessageStoreToNewIDSchema,
  convertRawMessageInfoToNewIDSchema,
  convertCalendarFilterToNewIDSchema,
  convertConnectionInfoToNewIDSchema,
} from 'lib/_generated/migration-utils.js';
import { extractKeyserverIDFromID } from 'lib/keyserver-conn/keyserver-call-utils.js';
import type {
  ClientDBEntryStoreOperation,
  ReplaceEntryOperation,
} from 'lib/ops/entries-store-ops';
import { entryStoreOpsHandlers } from 'lib/ops/entries-store-ops.js';
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
  type ReplaceMessageStoreLocalMessageInfoOperation,
  type MessageStoreOperation,
  messageStoreOpsHandlers,
} from 'lib/ops/message-store-ops.js';
import {
  type ReportStoreOperation,
  type ClientDBReportStoreOperation,
  convertReportsToReplaceReportOps,
  reportStoreOpsHandlers,
} from 'lib/ops/report-store-ops.js';
import {
  type ClientDBThreadActivityStoreOperation,
  threadActivityStoreOpsHandlers,
  type ReplaceThreadActivityEntryOperation,
} from 'lib/ops/thread-activity-store-ops.js';
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
import { createUpdateDBOpsForThreadStoreThreadInfos } from 'lib/shared/redux/client-db-utils.js';
import { deprecatedUpdateRolesAndPermissions } from 'lib/shared/redux/deprecated-update-roles-and-permissions.js';
import { legacyUpdateRolesAndPermissions } from 'lib/shared/redux/legacy-update-roles-and-permissions.js';
import { inconsistencyResponsesToReports } from 'lib/shared/report-utils.js';
import {
  getContainingThreadID,
  getCommunity,
  assertAllThreadInfosAreLegacy,
} from 'lib/shared/thread-utils.js';
import { keyserverStoreTransform } from 'lib/shared/transforms/keyserver-store-transform.js';
import { messageStoreMessagesBlocklistTransform } from 'lib/shared/transforms/message-store-transform.js';
import {
  DEPRECATED_unshimMessageStore,
  unshimFunc,
} from 'lib/shared/unshim-utils.js';
import {
  defaultAlertInfo,
  defaultAlertInfos,
  alertTypes,
} from 'lib/types/alert-types.js';
import { defaultEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarQuery } from 'lib/types/entry-types.js';
import type { EntryStore } from 'lib/types/entry-types.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import {
  messageTypes,
  type MessageType,
} from 'lib/types/message-types-enum.js';
import {
  type MessageStoreThreads,
  type RawMessageInfo,
} from 'lib/types/message-types.js';
import { minimallyEncodeRawThreadInfoWithMemberPermissions } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type {
  RawThreadInfo,
  ThinRawThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type {
  ReportStore,
  ClientReportCreationRequest,
} from 'lib/types/report-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import { defaultGlobalThemeInfo } from 'lib/types/theme-types.js';
import type {
  ClientDBThreadInfo,
  LegacyRawThreadInfo,
  LegacyThinRawThreadInfo,
  MixedRawThreadInfos,
  RawThreadInfos,
} from 'lib/types/thread-types.js';
import { stripMemberPermissionsFromRawThreadInfos } from 'lib/utils/member-info-utils.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateRawMessageInfoToClientDBMessageInfo,
} from 'lib/utils/message-ops-utils.js';
import {
  generateIDSchemaMigrationOpsForDrafts,
  convertMessageStoreThreadsToNewIDSchema,
  convertThreadStoreThreadInfosToNewIDSchema,
  createAsyncMigrate,
} from 'lib/utils/migration-utils.js';
import type {
  MigrationFunction,
  MigrationsManifest,
} from 'lib/utils/migration-utils.js';
import { entries } from 'lib/utils/objects.js';
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
import {
  handleReduxMigrationFailure,
  persistBlacklist,
} from './handle-redux-migration-failure.js';
import { persistMigrationForManagePinsThreadPermission } from './manage-pins-permission-migration.js';
import { persistMigrationToRemoveSelectRolePermissions } from './remove-select-role-permissions.js';
import type { AppState } from './state-types.js';
import { unshimClientDB, legacyUnshimClientDB } from './unshim-utils.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import { commCoreModule } from '../native-modules.js';
import type { NavInfo } from '../navigation/default-state.js';
import { defaultDeviceCameraInfo } from '../types/camera.js';
import { isTaskCancelledError } from '../utils/error-handling.js';
import { defaultURLPrefix } from '../utils/url-utils.js';
import { codeVersion } from '../version.mjs';

const legacyMigrations = {
  [1]: (state: AppState) => ({
    ...state,
    notifPermissionAlertInfo: defaultAlertInfo,
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
  [28]: (state: any) => {
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
      [string]: LegacyThinRawThreadInfo | ThinRawThreadInfo,
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
  [32]: (state: AppState) =>
    legacyUnshimClientDB(state, [messageTypes.MULTIMEDIA]),
  [33]: (state: AppState) =>
    legacyUnshimClientDB(state, [messageTypes.REACTION]),
  [34]: (state: any) => {
    const { threadIDsToNotifIDs, ...stateSansThreadIDsToNotifIDs } = state;
    return stateSansThreadIDsToNotifIDs;
  },
  [35]: (state: AppState) =>
    legacyUnshimClientDB(state, [messageTypes.MULTIMEDIA]),
  [36]: (state: AppState) => {
    // 1. Get threads and messages from SQLite `threads` and `messages` tables.
    const clientDBThreadInfos = commCoreModule.getAllThreadsSync();
    const clientDBMessageInfos = commCoreModule.getInitialMessagesSync();

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
  [39]: (state: AppState) =>
    legacyUnshimClientDB(state, [messageTypes.EDIT_MESSAGE]),
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
      await commCoreModule.processDBStoreOperations({
        messageStoreOperations: [
          ...messageStoreMessagesOperations,
          ...messageStoreThreadsOperations,
        ],
        threadStoreOperations: threadOperations,
        draftStoreOperations: draftOperations,
      });
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
      await commCoreModule.processDBStoreOperations({
        userStoreOperations: dbOperations,
      });
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
            : minimallyEncodeRawThreadInfoWithMemberPermissions(threadInfo);
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
      await commCoreModule.processDBStoreOperations({
        keyserverStoreOperations: dbOperations,
      });
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
      await commCoreModule.processDBStoreOperations({
        keyserverStoreOperations: dbOperations,
      });
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return newState;
      }
      return handleReduxMigrationFailure(newState);
    }
    return newState;
  },
  // Migration 64 is a noop to unblock a `native` release since the previous
  // contents are not ready to be deployed to prod and we don't want to
  // decrement migration 65.
  [64]: (state: AppState) => state,
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
      await commCoreModule.processDBStoreOperations({
        integrityStoreOperations: dbOperations,
      });
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return handleReduxMigrationFailure(state);
    }
    return state;
  },
  [66]: async (state: AppState) => {
    const stores = await commCoreModule.getClientDBStore();
    const keyserversDBInfo = stores.keyservers;

    const { translateClientDBData } = keyserverStoreOpsHandlers;
    const keyservers = translateClientDBData(keyserversDBInfo);

    // There is no modification of the keyserver data, but the ops handling
    // should correctly split the data between synced and non-synced tables

    const replaceOps: $ReadOnlyArray<ReplaceKeyserverOperation> = entries(
      keyservers,
    ).map(([id, keyserverInfo]) => ({
      type: 'replace_keyserver',
      payload: {
        id,
        keyserverInfo,
      },
    }));

    const keyserverStoreOperations: $ReadOnlyArray<ClientDBKeyserverStoreOperation> =
      keyserverStoreOpsHandlers.convertOpsToClientDBOps([
        { type: 'remove_all_keyservers' },
        ...replaceOps,
      ]);

    try {
      await commCoreModule.processDBStoreOperations({
        keyserverStoreOperations,
      });
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return handleReduxMigrationFailure(state);
    }

    return state;
  },
  [67]: (state: any) => {
    const { nextLocalID, ...rest } = state;
    return rest;
  },
  [68]: async (state: AppState) => {
    const { userStore, ...rest } = state;
    return rest;
  },
  [69]: (state: any) => {
    const { notifPermissionAlertInfo, ...rest } = state;
    const newState = {
      ...rest,
      alertStore: {
        alertInfos: defaultAlertInfos,
      },
    };

    return newState;
  },
  [70]: (state: any) => {
    const clientDBMessageInfos = commCoreModule.getInitialMessagesSync();
    const unsupportedMessageIDsToRemove = clientDBMessageInfos
      .filter(
        message =>
          parseInt(message.type) === messageTypes.UNSUPPORTED &&
          parseInt(message.future_type) === messageTypes.UPDATE_RELATIONSHIP,
      )
      .map(message => message.id);

    const messageStoreOperations: $ReadOnlyArray<ClientDBMessageStoreOperation> =
      [
        {
          type: 'remove',
          payload: { ids: unsupportedMessageIDsToRemove },
        },
      ];

    try {
      commCoreModule.processMessageStoreOperationsSync(messageStoreOperations);
    } catch (exception) {
      console.log(exception);
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return { ...state, cookie: null };
    }
    return state;
  },
  [71]: async (state: AppState) => {
    const replaceOps: $ReadOnlyArray<ReplaceThreadActivityEntryOperation> =
      entries(state.threadActivityStore).map(([threadID, entry]) => ({
        type: 'replace_thread_activity_entry',
        payload: {
          id: threadID,
          threadActivityStoreEntry: entry,
        },
      }));

    const dbOperations: $ReadOnlyArray<ClientDBThreadActivityStoreOperation> =
      threadActivityStoreOpsHandlers.convertOpsToClientDBOps([
        { type: 'remove_all_thread_activity_entries' },
        ...replaceOps,
      ]);

    try {
      await commCoreModule.processDBStoreOperations({
        threadActivityStoreOperations: dbOperations,
      });
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return handleReduxMigrationFailure(state);
    }
    return state;
  },
  [72]: (state: AppState) =>
    updateClientDBThreadStoreThreadInfos(
      state,
      patchRawThreadInfosWithSpecialRole,
      handleReduxMigrationFailure,
    ),
  [73]: (state: AppState) => {
    return {
      ...state,
      alertStore: {
        ...state.alertStore,
        alertInfos: {
          ...state.alertStore.alertInfos,
          [alertTypes.SIWE_BACKUP_MESSAGE]: defaultAlertInfo,
        },
      },
    };
  },
  [74]: (state: AppState) =>
    legacyUnshimClientDB(
      state,
      [messageTypes.UPDATE_RELATIONSHIP],
      handleReduxMigrationFailure,
    ),
  [75]: async (state: AppState) => {
    const replaceOps: $ReadOnlyArray<ReplaceEntryOperation> = entries(
      state.entryStore.entryInfos,
    ).map(([id, entry]) => ({
      type: 'replace_entry',
      payload: {
        id,
        entry,
      },
    }));

    const dbOperations: $ReadOnlyArray<ClientDBEntryStoreOperation> =
      entryStoreOpsHandlers.convertOpsToClientDBOps([
        { type: 'remove_all_entries' },
        ...replaceOps,
      ]);

    try {
      await commCoreModule.processDBStoreOperations({
        entryStoreOperations: dbOperations,
      });
    } catch (exception) {
      if (isTaskCancelledError(exception)) {
        return state;
      }
      return handleReduxMigrationFailure(state);
    }
    return state;
  },
};

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

type PersistedEntryStore = {
  +lastUserInteractionCalendar: number,
};
const entryStoreTransform: Transform = createTransform(
  (state: EntryStore): PersistedEntryStore => {
    return { lastUserInteractionCalendar: state.lastUserInteractionCalendar };
  },
  (state: PersistedEntryStore): EntryStore => {
    return { ...state, entryInfos: {}, daysToEntries: {} };
  },
  { whitelist: ['entryStore'] },
);

const migrations: MigrationsManifest<NavInfo, AppState> = Object.freeze({
  // This migration doesn't change the store but sets a persisted version
  // in the DB
  [75]: (async (state: AppState) => ({
    state,
    ops: {},
  }): MigrationFunction<NavInfo, AppState>),
  [76]: (async (state: AppState) => {
    const localMessageInfos = state.messageStore.local;

    const replaceOps: $ReadOnlyArray<ReplaceMessageStoreLocalMessageInfoOperation> =
      entries(localMessageInfos).map(([id, message]) => ({
        type: 'replace_local_message_info',
        payload: {
          id,
          localMessageInfo: message,
        },
      }));

    const operations: $ReadOnlyArray<MessageStoreOperation> = [
      {
        type: 'remove_all_local_message_infos',
      },
      ...replaceOps,
    ];

    const newMessageStore = messageStoreOpsHandlers.processStoreOperations(
      state.messageStore,
      operations,
    );

    return {
      state: {
        ...state,
        messageStore: newMessageStore,
      },
      ops: {
        messageStoreOperations: operations,
      },
    };
  }: MigrationFunction<NavInfo, AppState>),
  [77]: (async (state: AppState) => ({
    state,
    ops: {},
  }): MigrationFunction<NavInfo, AppState>),
  [78]: (async (state: AppState) => {
    const clientDBThreadInfos = commCoreModule.getAllThreadsSync();

    const operations = createUpdateDBOpsForThreadStoreThreadInfos(
      clientDBThreadInfos,
      deprecatedUpdateRolesAndPermissions,
    );

    return {
      state,
      ops: {
        threadStoreOperations: operations,
      },
    };
  }: MigrationFunction<NavInfo, AppState>),
  [79]: (async (state: AppState) => {
    return {
      state: {
        ...state,
        tunnelbrokerDeviceToken: {
          localToken: null,
          tunnelbrokerToken: null,
        },
      },
      ops: {},
    };
  }: MigrationFunction<NavInfo, AppState>),
  [80]: (async (state: AppState) => {
    const clientDBThreadInfos = commCoreModule.getAllThreadsSync();

    // This isn't actually accurate, but we force this cast here because the
    // types for createUpdateDBOpsForThreadStoreThreadInfos assume they're
    // converting from a client DB that contains RawThreadInfos. In fact, at
    // this point the client DB contains ThinRawThreadInfoWithPermissions.
    const stripMemberPermissions: RawThreadInfos => RawThreadInfos =
      (stripMemberPermissionsFromRawThreadInfos: any);

    const operations = createUpdateDBOpsForThreadStoreThreadInfos(
      clientDBThreadInfos,
      stripMemberPermissions,
    );

    return {
      state,
      ops: {
        threadStoreOperations: operations,
      },
    };
  }: MigrationFunction<NavInfo, AppState>),
  [81]: (async (state: any) => ({
    state: {
      ...state,
      queuedDMOperations: {
        operations: {},
      },
    },
    ops: {},
  }): MigrationFunction<NavInfo, AppState>),
  [82]: (async (state: any) => ({
    state: {
      ...state,
      queuedDMOperations: {
        threadQueue: state.queuedDMOperations.operations,
        messageQueue: {},
        entryQueue: {},
        membershipQueue: {},
      },
    },
    ops: {},
  }): MigrationFunction<NavInfo, AppState>),
  [83]: (async (state: AppState) => ({
    state: {
      ...state,
      holderStore: {
        storedHolders: {},
      },
    },
    ops: {},
  }): MigrationFunction<NavInfo, AppState>),
  [84]: (async (state: AppState) => ({
    state,
    ops: {},
  }): MigrationFunction<NavInfo, AppState>),
  [85]: (async (state: AppState) =>
    unshimClientDB(
      state,
      [messageTypes.MULTIMEDIA],
      handleReduxMigrationFailure,
    ): MigrationFunction<NavInfo, AppState>),
  [86]: (async (state: AppState) => ({
    state: {
      ...state,
      queuedDMOperations: {
        ...state.queuedDMOperations,
        shimmedOperations: [],
      },
    },
    ops: {},
  }): MigrationFunction<NavInfo, AppState>),
  [87]: (async (state: AppState) => {
    const { alertStore } = state;

    const newAlertInfos = Object.fromEntries(
      Object.entries(alertStore.alertInfos).map(([alertType, info]) => [
        alertType,
        {
          ...info,
          coldStartCount: 0,
        },
      ]),
    );

    return {
      state: {
        ...state,
        alertStore: {
          alertInfos: newAlertInfos,
        },
      },
      ops: {},
    };
  }: MigrationFunction<NavInfo, AppState>),
});

// NOTE: renaming this object, and especially the `version` property
// requires updating `native/native_rust_library/build.rs` to correctly
// scrap Redux state version from this file.
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: persistBlacklist,
  debug: __DEV__,
  version: 86,
  transforms: [
    messageStoreMessagesBlocklistTransform,
    reportStoreTransform,
    keyserverStoreTransform,
    entryStoreTransform,
  ],
  migrate: (createAsyncMigrate(
    legacyMigrations,
    { debug: __DEV__ },
    migrations,
    (error: Error, state: AppState) => {
      if (isTaskCancelledError(error)) {
        return state;
      }
      return handleReduxMigrationFailure(state);
    },
  ): any),
  timeout: ((__DEV__ ? 0 : 30000): number | void),
};

// This local exists to avoid a circular dependency where redux-setup needs to
// import all the navigation and screen stuff, but some of those screens want to
// access the persistor to purge its state.
let storedPersistor = null;
function setPersistor(persistor: *) {
  storedPersistor = persistor;
}
function getPersistor(): Persistor {
  invariant(storedPersistor, 'should be set');
  return storedPersistor;
}

export { persistConfig, codeVersion, setPersistor, getPersistor };
