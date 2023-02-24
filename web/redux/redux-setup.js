// @flow

import invariant from 'invariant';
import type { PersistState } from 'redux-persist/es/types.js';

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions.js';
import baseReducer from 'lib/reducers/master-reducer.js';
import { nonThreadCalendarFilters } from 'lib/selectors/calendar-filter-selectors.js';
import { mostRecentlyReadThreadSelector } from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { invalidSessionDowngrade } from 'lib/shared/account-utils.js';
import type { Shape } from 'lib/types/core.js';
import type {
  CryptoStore,
  OLMIdentityKeys,
  PickledOLMAccount,
} from 'lib/types/crypto-types.js';
import type { DraftStore } from 'lib/types/draft-types.js';
import type { EnabledApps } from 'lib/types/enabled-apps.js';
import type { EntryStore } from 'lib/types/entry-types.js';
import {
  type CalendarFilter,
  calendarThreadFilterTypes,
} from 'lib/types/filter-types.js';
import type { LifecycleState } from 'lib/types/lifecycle-state-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import type { BaseAction } from 'lib/types/redux-types.js';
import type { ReportStore } from 'lib/types/report-types.js';
import type { ConnectionInfo } from 'lib/types/socket-types.js';
import type { ThreadStore } from 'lib/types/thread-types.js';
import type { CurrentUserInfo, UserStore } from 'lib/types/user-types.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';

import {
  updateWindowActiveActionType,
  setDeviceIDActionType,
  updateNavInfoActionType,
  updateWindowDimensionsActionType,
  updateCalendarCommunityFilter,
  clearCalendarCommunityFilter,
} from './action-types.js';
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
import { filterThreadIDsBelongingToCommunity } from '../selectors/calendar-selectors.js';
import { activeThreadSelector } from '../selectors/nav-selectors.js';
import { type NavInfo } from '../types/nav-types.js';

export type WindowDimensions = { width: number, height: number };

export type AppState = {
  navInfo: NavInfo,
  deviceID: ?string,
  currentUserInfo: ?CurrentUserInfo,
  draftStore: DraftStore,
  sessionID: ?string,
  entryStore: EntryStore,
  threadStore: ThreadStore,
  userStore: UserStore,
  messageStore: MessageStore,
  updatesCurrentAsOf: number,
  loadingStatuses: { [key: string]: { [idx: number]: LoadingStatus } },
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  calendarPickedCommunityID: ?string,
  urlPrefix: string,
  windowDimensions: WindowDimensions,
  cookie?: void,
  deviceToken?: void,
  baseHref: string,
  connection: ConnectionInfo,
  watchedThreadIDs: $ReadOnlyArray<string>,
  lifecycleState: LifecycleState,
  enabledApps: EnabledApps,
  reportStore: ReportStore,
  nextLocalID: number,
  dataLoaded: boolean,
  windowActive: boolean,
  userPolicies: UserPolicies,
  cryptoStore: CryptoStore,
  _persist: ?PersistState,
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
  | { +type: 'SET_PICKLED_NOTIFICATION_ACCOUNT', payload: ?PickledOLMAccount }
  | {
      +type: 'UPDATE_CALENDAR_COMMUNITY_FILTER',
      +payload: string,
    }
  | {
      +type: 'CLEAR_CALENDAR_COMMUNITY_FILTER',
      +payload: void,
    };

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
  } else if (action.type === updateCalendarCommunityFilter) {
    const nonThreadFilters = nonThreadCalendarFilters(state.calendarFilters);

    const threadIDs = Array.from(
      filterThreadIDsBelongingToCommunity(
        action.payload,
        state.threadStore.threadInfos,
      ),
    );
    return {
      ...state,
      calendarFilters: [
        ...nonThreadFilters,
        {
          type: calendarThreadFilterTypes.THREAD_LIST,
          threadIDs,
        },
      ],
      calendarPickedCommunityID: action.payload,
    };
  } else if (action.type === clearCalendarCommunityFilter) {
    const nonThreadFilters = nonThreadCalendarFilters(state.calendarFilters);
    return {
      ...state,
      calendarFilters: nonThreadFilters,
      calendarPickedCommunityID: null,
    };
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
      sessionID: action.payload.sessionChange.sessionID,
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
    state = baseReducer(state, action).state;
  }

  state = {
    ...state,
    navInfo: reduceNavInfo(
      state.navInfo,
      action,
      state.threadStore.threadInfos,
    ),
    deviceID: reduceDeviceID(state.deviceID, action),
    cryptoStore: reduceCryptoStore(state.cryptoStore, action),
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
