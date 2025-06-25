// @flow

import invariant from 'invariant';
import type { PersistState } from 'redux-persist/es/types.js';

import { setClientDBStoreActionType } from 'lib/actions/client-db-store-actions.js';
import {
  logOutActionTypes,
  deleteKeyserverAccountActionTypes,
  deleteAccountActionTypes,
  keyserverAuthActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import { createReplaceThreadOperation } from 'lib/ops/create-replace-thread-operation.js';
import {
  type ReplaceKeyserverOperation,
  keyserverStoreOpsHandlers,
} from 'lib/ops/keyserver-store-ops.js';
import {
  createReplaceThreadActivityEntryOperation,
  type ReplaceThreadActivityEntryOperation,
  threadActivityStoreOpsHandlers,
} from 'lib/ops/thread-activity-store-ops.js';
import {
  type ThreadStoreOperation,
  threadStoreOpsHandlers,
} from 'lib/ops/thread-store-ops.js';
import { queueDBOps } from 'lib/reducers/db-ops-reducer.js';
import { reduceLoadingStatuses } from 'lib/reducers/loading-reducer.js';
import baseReducer from 'lib/reducers/master-reducer.js';
import { reduceCurrentUserInfo } from 'lib/reducers/user-reducer.js';
import { mostRecentlyReadThreadSelector } from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { shouldClearData } from 'lib/shared/data-utils.js';
import {
  invalidSessionDowngrade,
  identityInvalidSessionDowngrade,
  invalidSessionRecovery,
} from 'lib/shared/session-utils.js';
import { threadSpecs } from 'lib/shared/threads/thread-specs.js';
import type { AlertStore } from 'lib/types/alert-types.js';
import type { AuxUserStore } from 'lib/types/aux-user-types.js';
import type { RestoreBackupState } from 'lib/types/backup-types.js';
import type { CommunityStore } from 'lib/types/community-types.js';
import type { DBOpsStore } from 'lib/types/db-ops-types.js';
import type { QueuedDMOperations } from 'lib/types/dm-ops.js';
import { processDMOpsActionType } from 'lib/types/dm-ops.js';
import type { DraftStore } from 'lib/types/draft-types.js';
import type { EnabledApps } from 'lib/types/enabled-apps.js';
import type { EntryStore } from 'lib/types/entry-types.js';
import { type CalendarFilter } from 'lib/types/filter-types.js';
import type { HolderStore } from 'lib/types/holder-types.js';
import type { IntegrityStore } from 'lib/types/integrity-types.js';
import type { KeyserverStore } from 'lib/types/keyserver-types.js';
import type { LifecycleState } from 'lib/types/lifecycle-state-types.js';
import type { InviteLinksStore } from 'lib/types/link-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { WebNavInfo } from 'lib/types/nav-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import type { BaseAction, DispatchMetadata } from 'lib/types/redux-types.js';
import type { ReportStore } from 'lib/types/report-types.js';
import type { StoreOperations } from 'lib/types/store-ops-types.js';
import type { SyncedMetadataStore } from 'lib/types/synced-metadata-types.js';
import type { GlobalThemeInfo } from 'lib/types/theme-types.js';
import type { ThreadActivityStore } from 'lib/types/thread-activity-types';
import type { ThreadStore } from 'lib/types/thread-types.js';
import type { TunnelbrokerDeviceToken } from 'lib/types/tunnelbroker-device-token-types.js';
import type { CurrentUserInfo, UserStore } from 'lib/types/user-types.js';
import { resetUserSpecificState } from 'lib/utils/reducers-utils.js';

import {
  updateWindowActiveActionType,
  updateNavInfoActionType,
  updateWindowDimensionsActionType,
  setInitialReduxState,
} from './action-types.js';
import { reduceCommunityPickerStore } from './community-picker-reducer.js';
import { defaultWebState } from './default-state.js';
import reduceNavInfo from './nav-reducer.js';
import { reduceServicesAccessToken } from './services-access-token-reducer.js';
import { getVisibility } from './visibility.js';
import { activeThreadSelector } from '../selectors/nav-selectors.js';
import type { InitialReduxStateActionPayload } from '../types/redux-types.js';

export type WindowDimensions = { width: number, height: number };

export type CommunityPickerStore = {
  +chat: ?string,
  +calendar: ?string,
};

const nonUserSpecificFieldsWeb = [
  'loadingStatuses',
  'windowDimensions',
  'lifecycleState',
  'windowActive',
  'pushApiPublicKey',
  'keyserverStore',
  'initialStateLoaded',
  '_persist',
  'customServer',
  'clientDBStateLoaded',
];

// Before making changes here, make sure to consider how the added property
// should be stored. Think about redux-persist or SQLite as storage,
// backup and make sure blacklists/whitelists on all platforms are
// reflecting that. Please also update the Notion doc with Redux state:
// https://www.notion.so/commapp/Application-storage-1e3d823c518b807ab023daed163682b5#1e4d823c518b80bc97c2d0b5448413ad.
export type AppState = {
  +navInfo: WebNavInfo,
  +currentUserInfo: ?CurrentUserInfo,
  +draftStore: DraftStore,
  +entryStore: EntryStore,
  +threadStore: ThreadStore,
  +userStore: UserStore,
  +messageStore: MessageStore,
  +loadingStatuses: { [key: string]: { [idx: number]: LoadingStatus } },
  +calendarFilters: $ReadOnlyArray<CalendarFilter>,
  +communityPickerStore: CommunityPickerStore,
  +windowDimensions: WindowDimensions,
  +alertStore: AlertStore,
  +watchedThreadIDs: $ReadOnlyArray<string>,
  +lifecycleState: LifecycleState,
  +enabledApps: EnabledApps,
  +reportStore: ReportStore,
  +dataLoaded: boolean,
  +windowActive: boolean,
  +userPolicies: UserPolicies,
  +pushApiPublicKey: ?string,
  +_persist: ?PersistState,
  +commServicesAccessToken: ?string,
  +inviteLinksStore: InviteLinksStore,
  +keyserverStore: KeyserverStore,
  +threadActivityStore: ThreadActivityStore,
  +initialStateLoaded: boolean,
  +integrityStore: IntegrityStore,
  +globalThemeInfo: GlobalThemeInfo,
  +customServer: ?string,
  +communityStore: CommunityStore,
  +dbOpsStore: DBOpsStore,
  +syncedMetadataStore: SyncedMetadataStore,
  +auxUserStore: AuxUserStore,
  +tunnelbrokerDeviceToken: TunnelbrokerDeviceToken,
  +queuedDMOperations: QueuedDMOperations,
  +holderStore: HolderStore,
  +clientDBStateLoaded: boolean,
  +restoreBackupState: RestoreBackupState,
};

export type Action = $ReadOnly<
  | BaseAction
  | {
      +dispatchMetadata?: DispatchMetadata,
      ...
        | { +type: 'UPDATE_NAV_INFO', +payload: Partial<WebNavInfo> }
        | {
            +type: 'UPDATE_WINDOW_DIMENSIONS',
            +payload: WindowDimensions,
          }
        | {
            +type: 'UPDATE_WINDOW_ACTIVE',
            +payload: boolean,
          }
        | {
            +type: 'SET_INITIAL_REDUX_STATE',
            +payload: InitialReduxStateActionPayload,
          },
    },
>;

function reducer(oldState: AppState | void, action: Action): AppState {
  invariant(oldState, 'should be set');
  let state = oldState;
  let storeOperations: StoreOperations = {};

  if (
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.currentUserInfo &&
      invalidSessionRecovery(
        state,
        action.payload.preRequestUserState?.currentUserInfo,
        action.payload.authActionSource,
      )) ||
    (action.type === keyserverAuthActionTypes.success &&
      invalidSessionRecovery(
        state,
        action.payload.preRequestUserInfo,
        action.payload.authActionSource,
      ))
  ) {
    return state;
  }

  if (
    (action.type === logOutActionTypes.success ||
      action.type === deleteAccountActionTypes.success) &&
    identityInvalidSessionDowngrade(
      oldState,
      action.payload.currentUserInfo,
      action.payload.preRequestUserState,
    )
  ) {
    return {
      ...oldState,
      loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    };
  }

  if (action.type === setInitialReduxState) {
    const { userInfos, keyserverInfos, actualizedCalendarQuery, ...rest } =
      action.payload;
    const replaceOperations: ReplaceKeyserverOperation[] = [];
    for (const keyserverID in keyserverInfos) {
      replaceOperations.push({
        type: 'replace_keyserver',
        payload: {
          id: keyserverID,
          keyserverInfo: {
            ...state.keyserverStore.keyserverInfos[keyserverID],
            ...keyserverInfos[keyserverID],
            actualizedCalendarQuery,
          },
        },
      });
    }
    let newState = {
      ...state,
      ...rest,
      keyserverStore: keyserverStoreOpsHandlers.processStoreOperations(
        state.keyserverStore,
        replaceOperations,
      ),
      initialStateLoaded: true,
    };

    if (userInfos) {
      newState = { ...newState, userStore: { userInfos } };
    }
    return validateStateAndQueueOpsProcessing(action, oldState, newState, {
      ...storeOperations,
      keyserverStoreOperations: [
        ...(storeOperations.keyserverStoreOperations ?? []),
        ...replaceOperations,
      ],
    });
  } else if (action.type === updateWindowDimensionsActionType) {
    return validateStateAndQueueOpsProcessing(
      action,
      oldState,
      {
        ...state,
        windowDimensions: action.payload,
      },
      storeOperations,
    );
  } else if (action.type === updateWindowActiveActionType) {
    return validateStateAndQueueOpsProcessing(
      action,
      oldState,
      {
        ...state,
        windowActive: action.payload,
      },
      storeOperations,
    );
  } else if (action.type === setNewSessionActionType) {
    const { keyserverID, sessionChange } = action.payload;
    if (!state.keyserverStore.keyserverInfos[keyserverID]) {
      if (sessionChange.cookie?.startsWith('user=')) {
        console.log(
          'received sessionChange with user cookie, ' +
            `but keyserver ${keyserverID} is not in KeyserverStore!`,
        );
      }
      return state;
    }

    if (
      invalidSessionDowngrade(
        oldState,
        sessionChange.currentUserInfo,
        action.payload.preRequestUserState,
        keyserverID,
      )
    ) {
      return {
        ...oldState,
        loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
      };
    }

    const replaceOperation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverStore.keyserverInfos[keyserverID],
          sessionID: sessionChange.sessionID,
        },
      },
    };
    state = {
      ...state,
      keyserverStore: keyserverStoreOpsHandlers.processStoreOperations(
        state.keyserverStore,
        [replaceOperation],
      ),
    };
    storeOperations = {
      ...storeOperations,
      keyserverStoreOperations: [
        ...(storeOperations.keyserverStoreOperations ?? []),
        replaceOperation,
      ],
    };
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    const { currentUserInfo, preRequestUserState } = action.payload;
    const newKeyserverIDs = [];
    for (const keyserverID of action.payload.keyserverIDs) {
      if (
        invalidSessionDowngrade(
          state,
          currentUserInfo,
          preRequestUserState,
          keyserverID,
        )
      ) {
        continue;
      }
      newKeyserverIDs.push(keyserverID);
    }
    if (newKeyserverIDs.length === 0) {
      return {
        ...state,
        loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
      };
    }
    action = {
      ...action,
      payload: {
        ...action.payload,
        keyserverIDs: newKeyserverIDs,
      },
    };
  } else if (action.type === setClientDBStoreActionType) {
    state = {
      ...state,
      clientDBStateLoaded: true,
    };
  }

  if (action.type !== updateNavInfoActionType) {
    // We're calling this reducer twice: here and in the baseReducer. This call
    // is only used to determine the new current user ID. We don't want to use
    // the remaining part of the current user info, because it is possible that
    // the reducer returned a modified ID without cleared remaining parts of
    // the current user info - this would be a bug, but we want to be extra
    // careful when clearing the state.
    // When newCurrentUserInfo has the same ID as state.currentUserInfo
    // the state won't be cleared and the current user info determined in
    // baseReducer will be equal to the newCurrentUserInfo.
    // When newCurrentUserInfo has different ID than state.currentUserInfo, we
    // reset the state and pass it to the baseReducer. Then, in baseReducer,
    // reduceCurrentUserInfo acts on the cleared state and may return
    // a different result than newCurrentUserInfo.
    // Overall, the solution is a little wasteful, but makes us sure that we
    // never keep the info of the user when the current user ID changes.
    const newCurrentUserInfo = reduceCurrentUserInfo(
      state.currentUserInfo,
      action,
    );
    if (shouldClearData(state.currentUserInfo?.id, newCurrentUserInfo?.id)) {
      state = resetUserSpecificState(
        state,
        defaultWebState,
        nonUserSpecificFieldsWeb,
      );
    }

    const baseReducerResult = baseReducer(state, action);
    state = baseReducerResult.state;
    storeOperations = {
      ...baseReducerResult.storeOperations,
      keyserverStoreOperations: [
        ...(storeOperations.keyserverStoreOperations ?? []),
        ...(baseReducerResult.storeOperations.keyserverStoreOperations ?? []),
      ],
    };
  }

  const communityPickerStore = reduceCommunityPickerStore(
    state.communityPickerStore,
    action,
  );

  state = {
    ...state,
    navInfo: reduceNavInfo(
      state.navInfo,
      action,
      state.threadStore.threadInfos,
    ),
    communityPickerStore,
    commServicesAccessToken: reduceServicesAccessToken(
      state.commServicesAccessToken,
      action,
    ),
  };

  return validateStateAndQueueOpsProcessing(
    action,
    oldState,
    state,
    storeOperations,
  );
}

function validateStateAndQueueOpsProcessing(
  action: Action,
  oldState: AppState,
  state: AppState,
  storeOperations: StoreOperations,
): AppState {
  const updateActiveThreadOps: ThreadStoreOperation[] = [];
  if (
    (state.navInfo.activeChatThreadID &&
      !state.navInfo.pendingThread &&
      !state.threadStore.threadInfos[state.navInfo.activeChatThreadID]) ||
    (!state.navInfo.activeChatThreadID && isLoggedIn(state))
  ) {
    // Makes sure the active thread always exists
    state = {
      ...state,
      navInfo: {
        ...state.navInfo,
        activeChatThreadID: mostRecentlyReadThreadSelector(state),
      },
    };
  }

  const activeThread = activeThreadSelector(state);
  if (
    activeThread &&
    !state.navInfo.pendingThread &&
    state.threadStore.threadInfos[activeThread].currentUser.unread &&
    getVisibility().hidden()
  ) {
    console.warn(
      `thread ${activeThread} is active and unread, ` +
        'but visibilityjs reports the window is not visible',
    );
  }
  if (
    activeThread &&
    !state.navInfo.pendingThread &&
    state.threadStore.threadInfos[activeThread].currentUser.unread &&
    typeof document !== 'undefined' &&
    document &&
    'hasFocus' in document &&
    !document.hasFocus()
  ) {
    console.warn(
      `thread ${activeThread} is active and unread, ` +
        'but document.hasFocus() is false',
    );
  }
  if (
    activeThread &&
    !getVisibility().hidden() &&
    typeof document !== 'undefined' &&
    document &&
    'hasFocus' in document &&
    document.hasFocus() &&
    !state.navInfo.pendingThread &&
    state.threadStore.threadInfos[activeThread].currentUser.unread &&
    !threadSpecs[state.threadStore.threadInfos[activeThread].type].protocol()
      .threadActivityUpdatedByDMActivityHandler
  ) {
    // Makes sure a currently focused thread is never unread
    const activeThreadInfo = state.threadStore.threadInfos[activeThread];
    const updatedActiveThreadInfo = {
      ...activeThreadInfo,
      currentUser: {
        ...activeThreadInfo.currentUser,
        unread: false,
      },
    };
    updateActiveThreadOps.push(
      createReplaceThreadOperation(activeThread, updatedActiveThreadInfo),
    );
  }

  const oldActiveThread = activeThreadSelector(oldState);
  if (
    activeThread &&
    oldActiveThread !== activeThread &&
    state.messageStore.threads[activeThread]
  ) {
    const now = Date.now();
    const replaceOperation: ReplaceThreadActivityEntryOperation =
      createReplaceThreadActivityEntryOperation(
        activeThread,
        {
          ...state.threadActivityStore[activeThread],
          lastNavigatedTo: now,
        },
        state.threadStore.threadInfos,
      );

    const threadActivityStore =
      threadActivityStoreOpsHandlers.processStoreOperations(
        state.threadActivityStore,
        [replaceOperation],
      );

    state = {
      ...state,
      threadActivityStore,
    };

    storeOperations = {
      ...storeOperations,
      threadActivityStoreOperations: [
        ...(storeOperations.threadActivityStoreOperations ?? []),
        replaceOperation,
      ],
    };
  }

  if (updateActiveThreadOps.length > 0) {
    state = {
      ...state,
      threadStore: threadStoreOpsHandlers.processStoreOperations(
        state.threadStore,
        updateActiveThreadOps,
      ),
    };
    storeOperations = {
      ...storeOperations,
      threadStoreOperations: [
        ...(storeOperations.threadStoreOperations ?? []),
        ...updateActiveThreadOps,
      ],
    };
  }

  // The operations were already dispatched from the main tab
  if (action.dispatchSource === 'tab-sync') {
    return state;
  }

  let notificationsCreationData = null;
  if (action.type === processDMOpsActionType) {
    notificationsCreationData = action.payload.notificationsCreationData;
  }

  return {
    ...state,
    dbOpsStore: queueDBOps(
      state.dbOpsStore,
      action.dispatchMetadata,
      storeOperations,
      notificationsCreationData,
    ),
  };
}

export { nonUserSpecificFieldsWeb, reducer };
