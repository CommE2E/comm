// @flow

import invariant from 'invariant';
import type { PersistState } from 'redux-persist/es/types.js';

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions.js';
import { reportStoreOpsHandlers } from 'lib/ops/report-store-ops.js';
import baseReducer from 'lib/reducers/master-reducer.js';
import { mostRecentlyReadThreadSelector } from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { invalidSessionDowngrade } from 'lib/shared/session-utils.js';
import type { Shape } from 'lib/types/core.js';
import type {
  CryptoStore,
  OLMIdentityKeys,
  PickledOLMAccount,
} from 'lib/types/crypto-types.js';
import type { LastCommunicatedPlatformDetails } from 'lib/types/device-types.js';
import type { DraftStore } from 'lib/types/draft-types.js';
import type { EnabledApps } from 'lib/types/enabled-apps.js';
import type { EntryStore, CalendarQuery } from 'lib/types/entry-types.js';
import { type CalendarFilter } from 'lib/types/filter-types.js';
import type { KeyserverStore } from 'lib/types/keyserver-types.js';
import type { LifecycleState } from 'lib/types/lifecycle-state-types.js';
import type { InviteLinksStore } from 'lib/types/link-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import type { BaseAction } from 'lib/types/redux-types.js';
import type { ReportStore } from 'lib/types/report-types.js';
import type { ThreadStore } from 'lib/types/thread-types.js';
import type { CurrentUserInfo, UserStore } from 'lib/types/user-types.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';
import type { NotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import {
  updateWindowActiveActionType,
  setDeviceIDActionType,
  updateNavInfoActionType,
  updateWindowDimensionsActionType,
} from './action-types.js';
import { reduceCommunityPickerStore } from './community-picker-reducer.js';
import {
  reduceCryptoStore,
  setPrimaryIdentityKeys,
  setNotificationIdentityKeys,
  setPickledNotificationAccount,
  setPickledPrimaryAccount,
} from './crypto-store-reducer.js';
import { reduceDeviceID } from './device-id-reducer.js';
import reduceNavInfo from './nav-reducer.js';
import { getVisibility } from './visibility.js';
import { databaseModule } from '../database/database-module-provider.js';
import { activeThreadSelector } from '../selectors/nav-selectors.js';
import { type NavInfo } from '../types/nav-types.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

export type WindowDimensions = { width: number, height: number };

export type CommunityPickerStore = {
  +chat: ?string,
  +calendar: ?string,
};

export type AppState = {
  +navInfo: NavInfo,
  +deviceID: ?string,
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
  +deviceToken: ?string,
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
  +cryptoStore: CryptoStore,
  +pushApiPublicKey: ?string,
  +_persist: ?PersistState,
  +commServicesAccessToken: ?string,
  +inviteLinksStore: InviteLinksStore,
  +lastCommunicatedPlatformDetails: LastCommunicatedPlatformDetails,
  +keyserverStore: KeyserverStore,
};

export type Action =
  | BaseAction
  | { type: 'UPDATE_NAV_INFO', payload: Shape<NavInfo> }
  | {
      type: 'UPDATE_WINDOW_DIMENSIONS',
      payload: WindowDimensions,
    }
  | {
      type: 'UPDATE_WINDOW_ACTIVE',
      payload: boolean,
    }
  | {
      type: 'SET_DEVICE_ID',
      payload: string,
    }
  | { +type: 'SET_PRIMARY_IDENTITY_KEYS', payload: ?OLMIdentityKeys }
  | { +type: 'SET_NOTIFICATION_IDENTITY_KEYS', payload: ?OLMIdentityKeys }
  | { +type: 'SET_PICKLED_PRIMARY_ACCOUNT', payload: ?PickledOLMAccount }
  | { +type: 'SET_PICKLED_NOTIFICATION_ACCOUNT', payload: ?PickledOLMAccount };

export function reducer(oldState: AppState | void, action: Action): AppState {
  invariant(oldState, 'should be set');
  let state = oldState;

  if (action.type === updateWindowDimensionsActionType) {
    return validateState(oldState, {
      ...state,
      windowDimensions: action.payload,
    });
  } else if (action.type === updateWindowActiveActionType) {
    return validateState(oldState, {
      ...state,
      windowActive: action.payload,
    });
  } else if (action.type === setNewSessionActionType) {
    if (
      invalidSessionDowngrade(
        oldState,
        action.payload.sessionChange.currentUserInfo,
        action.payload.preRequestUserState,
      )
    ) {
      return oldState;
    }

    state = {
      ...state,
      keyserverStore: {
        ...state.keyserverStore,
        keyserverInfos: {
          ...state.keyserverStore.keyserverInfos,
          [ashoatKeyserverID]: {
            ...state.keyserverStore.keyserverInfos[ashoatKeyserverID],
            sessionID: action.payload.sessionChange.sessionID,
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
      )) ||
    (action.type === deleteAccountActionTypes.success &&
      invalidSessionDowngrade(
        oldState,
        action.payload.currentUserInfo,
        action.payload.preRequestUserState,
      ))
  ) {
    return oldState;
  }

  if (
    action.type !== updateNavInfoActionType &&
    action.type !== setDeviceIDActionType &&
    action.type !== setPrimaryIdentityKeys &&
    action.type !== setNotificationIdentityKeys &&
    action.type !== setPickledPrimaryAccount &&
    action.type !== setPickledNotificationAccount
  ) {
    const baseReducerResult = baseReducer(state, action);
    state = baseReducerResult.state;

    const {
      storeOperations: { draftStoreOperations, reportStoreOperations },
    } = baseReducerResult;
    if (draftStoreOperations.length > 0 || reportStoreOperations.length > 0) {
      (async () => {
        const isSupported = await databaseModule.isDatabaseSupported();
        if (!isSupported) {
          return;
        }
        const convertedReportStoreOperations =
          reportStoreOpsHandlers.convertOpsToClientDBOps(reportStoreOperations);
        await databaseModule.schedule({
          type: workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
          storeOperations: {
            draftStoreOperations,
            reportStoreOperations: convertedReportStoreOperations,
          },
        });
      })();
    }
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
    deviceID: reduceDeviceID(state.deviceID, action),
    cryptoStore: reduceCryptoStore(state.cryptoStore, action),
    communityPickerStore,
  };

  return validateState(oldState, state);
}

function validateState(oldState: AppState, state: AppState): AppState {
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
    state = {
      ...state,
      threadStore: {
        ...state.threadStore,
        threadInfos: {
          ...state.threadStore.threadInfos,
          [activeThread]: {
            ...state.threadStore.threadInfos[activeThread],
            currentUser: {
              ...state.threadStore.threadInfos[activeThread].currentUser,
              unread: false,
            },
          },
        },
      },
    };
  }

  const oldActiveThread = activeThreadSelector(oldState);
  if (
    activeThread &&
    oldActiveThread !== activeThread &&
    state.messageStore.threads[activeThread]
  ) {
    // Update messageStore.threads[activeThread].lastNavigatedTo
    state = {
      ...state,
      messageStore: {
        ...state.messageStore,
        threads: {
          ...state.messageStore.threads,
          [activeThread]: {
            ...state.messageStore.threads[activeThread],
            lastNavigatedTo: Date.now(),
          },
        },
      },
    };
  }

  return state;
}
