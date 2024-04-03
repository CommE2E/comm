// @flow

import invariant from 'invariant';
import type { PersistState } from 'redux-persist/es/types.js';

import {
  logOutActionTypes,
  deleteKeyserverAccountActionTypes,
  deleteAccountActionTypes,
  identityRegisterActionTypes,
  identityLogInActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import {
  type ReplaceKeyserverOperation,
  keyserverStoreOpsHandlers,
} from 'lib/ops/keyserver-store-ops.js';
import {
  type ThreadStoreOperation,
  threadStoreOpsHandlers,
} from 'lib/ops/thread-store-ops.js';
import { queueDBOps } from 'lib/reducers/db-ops-reducer.js';
import { reduceLoadingStatuses } from 'lib/reducers/loading-reducer.js';
import baseReducer from 'lib/reducers/master-reducer.js';
import { mostRecentlyReadThreadSelector } from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  invalidSessionDowngrade,
  identityInvalidSessionDowngrade,
} from 'lib/shared/session-utils.js';
import type { AuxUserStore } from 'lib/types/aux-user-types.js';
import type { CommunityStore } from 'lib/types/community-types.js';
import type { MessageID, DBOpsStore } from 'lib/types/db-ops-types.js';
import type { DraftStore } from 'lib/types/draft-types.js';
import type { EnabledApps } from 'lib/types/enabled-apps.js';
import type { EntryStore } from 'lib/types/entry-types.js';
import { type CalendarFilter } from 'lib/types/filter-types.js';
import type { IntegrityStore } from 'lib/types/integrity-types.js';
import type { KeyserverStore } from 'lib/types/keyserver-types.js';
import type { LifecycleState } from 'lib/types/lifecycle-state-types.js';
import type { InviteLinksStore } from 'lib/types/link-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { WebNavInfo } from 'lib/types/nav-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import type { BaseAction } from 'lib/types/redux-types.js';
import type { ReportStore } from 'lib/types/report-types.js';
import type { StoreOperations } from 'lib/types/store-ops-types.js';
import type { GlobalThemeInfo } from 'lib/types/theme-types.js';
import type { ThreadActivityStore } from 'lib/types/thread-activity-types';
import type { ThreadStore } from 'lib/types/thread-types.js';
import type { CurrentUserInfo, UserStore } from 'lib/types/user-types.js';
import type { NotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
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
import { onStateDifference } from './redux-debug-utils.js';
import { reduceServicesAccessToken } from './services-access-token-reducer.js';
import { getVisibility } from './visibility.js';
import { activeThreadSelector } from '../selectors/nav-selectors.js';
import type { InitialReduxState } from '../types/redux-types.js';

export type WindowDimensions = { width: number, height: number };

export type CommunityPickerStore = {
  +chat: ?string,
  +calendar: ?string,
};

const nonUserSpecificFieldsWeb = [
  'loadingStatuses',
  'windowDimensions',
  'lifecycleState',
  'nextLocalID',
  'windowActive',
  'pushApiPublicKey',
  'keyserverStore',
  'initialStateLoaded',
  '_persist',
  'customServer',
];

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
  +notifPermissionAlertInfo: NotifPermissionAlertInfo,
  +watchedThreadIDs: $ReadOnlyArray<string>,
  +lifecycleState: LifecycleState,
  +enabledApps: EnabledApps,
  +reportStore: ReportStore,
  +nextLocalID: number,
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
  +auxUserStore: AuxUserStore,
};

export type Action = $ReadOnly<
  | BaseAction
  | {
      +messageID?: MessageID,
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
        | { +type: 'SET_INITIAL_REDUX_STATE', +payload: InitialReduxState },
    },
>;

function reducer(oldState: AppState | void, action: Action): AppState {
  invariant(oldState, 'should be set');
  let state = oldState;
  let storeOperations: StoreOperations = {
    draftStoreOperations: [],
    threadStoreOperations: [],
    messageStoreOperations: [],
    reportStoreOperations: [],
    userStoreOperations: [],
    keyserverStoreOperations: [],
    communityStoreOperations: [],
    integrityStoreOperations: [],
    auxUserStoreOperations: [],
  };

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
    return validateStateAndQueueOpsProcessing(
      action,
      oldState,
      {
        ...state,
        ...rest,
        userStore: { userInfos },
        keyserverStore: keyserverStoreOpsHandlers.processStoreOperations(
          state.keyserverStore,
          replaceOperations,
        ),
        initialStateLoaded: true,
      },
      {
        ...storeOperations,
        keyserverStoreOperations: [
          ...storeOperations.keyserverStoreOperations,
          ...replaceOperations,
        ],
      },
    );
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
        ...storeOperations.keyserverStoreOperations,
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
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    const { currentUserInfo, preRequestUserState } = action.payload;
    if (
      identityInvalidSessionDowngrade(
        oldState,
        currentUserInfo,
        preRequestUserState,
      )
    ) {
      return {
        ...oldState,
        loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
      };
    }

    state = resetUserSpecificState(
      state,
      defaultWebState,
      nonUserSpecificFieldsWeb,
    );
  } else if (action.type === identityRegisterActionTypes.success) {
    state = resetUserSpecificState(
      state,
      defaultWebState,
      nonUserSpecificFieldsWeb,
    );
  } else if (
    action.type === identityLogInActionTypes.success &&
    action.payload.userID !== action.payload.preRequestUserState?.id
  ) {
    state = resetUserSpecificState(
      state,
      defaultWebState,
      nonUserSpecificFieldsWeb,
    );
  }

  if (action.type !== updateNavInfoActionType) {
    const baseReducerResult = baseReducer(state, action, onStateDifference);
    state = baseReducerResult.state;
    storeOperations = {
      ...baseReducerResult.storeOperations,
      keyserverStoreOperations: [
        ...storeOperations.keyserverStoreOperations,
        ...baseReducerResult.storeOperations.keyserverStoreOperations,
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
    state.threadStore.threadInfos[activeThread].currentUser.unread
  ) {
    // Makes sure a currently focused thread is never unread
    const activeThreadInfo = state.threadStore.threadInfos[activeThread];
    updateActiveThreadOps.push({
      type: 'replace',
      payload: {
        id: activeThread,
        threadInfo: {
          ...activeThreadInfo,
          currentUser: {
            ...activeThreadInfo.currentUser,
            unread: false,
          },
        },
      },
    });
  }

  const oldActiveThread = activeThreadSelector(oldState);
  if (
    activeThread &&
    oldActiveThread !== activeThread &&
    state.messageStore.threads[activeThread]
  ) {
    const now = Date.now();
    state = {
      ...state,
      threadActivityStore: {
        ...state.threadActivityStore,
        [(activeThread: string)]: {
          ...state.threadActivityStore[activeThread],
          lastNavigatedTo: now,
        },
      },
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
        ...storeOperations.threadStoreOperations,
        ...updateActiveThreadOps,
      ],
    };
  }

  // The operations were already dispatched from the main tab

  // For now the `dispatchSource` field is not included in any of the
  // redux actions and this causes flow to throw an error.
  // As soon as one of the actions is updated, this fix (and the corresponding
  // one in tab-synchronization.js) can be removed.
  // $FlowFixMe
  if (action.dispatchSource === 'tab-sync') {
    return state;
  }

  return {
    ...state,
    dbOpsStore: queueDBOps(state.dbOpsStore, action.messageID, storeOperations),
  };
}

export { nonUserSpecificFieldsWeb, reducer };
