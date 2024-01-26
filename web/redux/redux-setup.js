// @flow

import invariant from 'invariant';
import type { PersistState } from 'redux-persist/es/types.js';

import {
  logOutActionTypes,
  deleteKeyserverAccountActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import {
  type ThreadStoreOperation,
  threadStoreOpsHandlers,
} from 'lib/ops/thread-store-ops.js';
import { reduceLoadingStatuses } from 'lib/reducers/loading-reducer.js';
import baseReducer from 'lib/reducers/master-reducer.js';
import { mostRecentlyReadThreadSelector } from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { invalidSessionDowngrade } from 'lib/shared/session-utils.js';
import type { CryptoStore } from 'lib/types/crypto-types.js';
import type { DraftStore } from 'lib/types/draft-types.js';
import type { EnabledApps } from 'lib/types/enabled-apps.js';
import type { EntryStore, CalendarQuery } from 'lib/types/entry-types.js';
import { type CalendarFilter } from 'lib/types/filter-types.js';
import type { IntegrityStore } from 'lib/types/integrity-types.js';
import type { KeyserverStore } from 'lib/types/keyserver-types.js';
import type { LifecycleState } from 'lib/types/lifecycle-state-types.js';
import type { InviteLinksStore } from 'lib/types/link-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import type { BaseAction } from 'lib/types/redux-types.js';
import type { ReportStore } from 'lib/types/report-types.js';
import type { StoreOperations } from 'lib/types/store-ops-types.js';
import type { GlobalThemeInfo } from 'lib/types/theme-types.js';
import type { ThreadActivityStore } from 'lib/types/thread-activity-types';
import type { ThreadStore } from 'lib/types/thread-types.js';
import type { CurrentUserInfo, UserStore } from 'lib/types/user-types.js';
import type { NotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import {
  updateWindowActiveActionType,
  updateNavInfoActionType,
  updateWindowDimensionsActionType,
  setInitialReduxState,
} from './action-types.js';
import { reduceCommunityPickerStore } from './community-picker-reducer.js';
import { reduceCryptoStore, setCryptoStore } from './crypto-store-reducer.js';
import reduceNavInfo from './nav-reducer.js';
import { onStateDifference } from './redux-debug-utils.js';
import { getVisibility } from './visibility.js';
import { processDBStoreOperations } from '../database/utils/store.js';
import { activeThreadSelector } from '../selectors/nav-selectors.js';
import { type NavInfo } from '../types/nav-types.js';
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
  +navInfo: NavInfo,
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
  +actualizedCalendarQuery: CalendarQuery,
  +watchedThreadIDs: $ReadOnlyArray<string>,
  +lifecycleState: LifecycleState,
  +enabledApps: EnabledApps,
  +reportStore: ReportStore,
  +nextLocalID: number,
  +dataLoaded: boolean,
  +windowActive: boolean,
  +userPolicies: UserPolicies,
  +cryptoStore: ?CryptoStore,
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
};

export type Action =
  | BaseAction
  | { type: 'UPDATE_NAV_INFO', payload: Partial<NavInfo> }
  | {
      type: 'UPDATE_WINDOW_DIMENSIONS',
      payload: WindowDimensions,
    }
  | {
      type: 'UPDATE_WINDOW_ACTIVE',
      payload: boolean,
    }
  | { +type: 'SET_CRYPTO_STORE', payload: CryptoStore }
  | { +type: 'SET_INITIAL_REDUX_STATE', payload: InitialReduxState };

function reducer(oldState: AppState | void, action: Action): AppState {
  invariant(oldState, 'should be set');
  let state = oldState;
  let storeOperations: StoreOperations = {
    draftStoreOperations: [],
    threadStoreOperations: [],
    messageStoreOperations: [],
    reportStoreOperations: [],
    userStoreOperations: [],
  };

  if (action.type === setInitialReduxState) {
    const { userInfos, keyserverInfos, ...rest } = action.payload;
    const newKeyserverInfos = { ...state.keyserverStore.keyserverInfos };
    for (const keyserverID in keyserverInfos) {
      newKeyserverInfos[keyserverID] = {
        ...newKeyserverInfos[keyserverID],
        ...keyserverInfos[keyserverID],
      };
    }
    return validateStateAndProcessDBOperations(
      oldState,
      {
        ...state,
        ...rest,
        userStore: { userInfos },
        keyserverStore: {
          ...state.keyserverStore,
          keyserverInfos: newKeyserverInfos,
        },
        initialStateLoaded: true,
      },
      storeOperations,
    );
  } else if (action.type === updateWindowDimensionsActionType) {
    return validateStateAndProcessDBOperations(
      oldState,
      {
        ...state,
        windowDimensions: action.payload,
      },
      storeOperations,
    );
  } else if (action.type === updateWindowActiveActionType) {
    return validateStateAndProcessDBOperations(
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

    state = {
      ...state,
      keyserverStore: {
        ...state.keyserverStore,
        keyserverInfos: {
          ...state.keyserverStore.keyserverInfos,
          [keyserverID]: {
            ...state.keyserverStore.keyserverInfos[keyserverID],
            sessionID: sessionChange.sessionID,
          },
        },
      },
    };
  } else if (
    (action.type === logOutActionTypes.success &&
      invalidSessionDowngrade(
        oldState,
        action.payload.currentUserInfo,
        action.payload.preRequestUserState,
        ashoatKeyserverID,
      )) ||
    (action.type === deleteKeyserverAccountActionTypes.success &&
      invalidSessionDowngrade(
        oldState,
        action.payload.currentUserInfo,
        action.payload.preRequestUserState,
        ashoatKeyserverID,
      )) ||
    (action.type === deleteAccountActionTypes.success &&
      invalidSessionDowngrade(
        state,
        action.payload.currentUserInfo,
        action.payload.preRequestUserState,
        ashoatKeyserverID,
      ))
  ) {
    return {
      ...oldState,
      loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    };
  }

  if (
    action.type !== updateNavInfoActionType &&
    action.type !== setCryptoStore
  ) {
    const baseReducerResult = baseReducer(state, action, onStateDifference);
    state = baseReducerResult.state;
    storeOperations = baseReducerResult.storeOperations;
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
    cryptoStore: reduceCryptoStore(state.cryptoStore, action),
    communityPickerStore,
  };

  return validateStateAndProcessDBOperations(oldState, state, storeOperations);
}

function validateStateAndProcessDBOperations(
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
    // TODO (atul): Try to get rid of this ridiculous branching.
    if (activeThreadInfo.minimallyEncoded) {
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
    } else {
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

  void processDBStoreOperations(
    storeOperations,
    state.currentUserInfo?.id ?? null,
  );

  return state;
}

export { nonUserSpecificFieldsWeb, reducer };
