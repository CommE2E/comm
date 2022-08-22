// @flow

import invariant from 'invariant';
import type { PersistState } from 'redux-persist/src/types';

import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions';
import baseReducer from 'lib/reducers/master-reducer';
import { mostRecentlyReadThreadSelector } from 'lib/selectors/thread-selectors';
import { isLoggedIn } from 'lib/selectors/user-selectors';
import { invalidSessionDowngrade } from 'lib/shared/account-utils';
import type { Shape } from 'lib/types/core';
import type { EnabledApps } from 'lib/types/enabled-apps';
import type { EntryStore } from 'lib/types/entry-types';
import type { CalendarFilter } from 'lib/types/filter-types';
import type { LifecycleState } from 'lib/types/lifecycle-state-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { MessageStore } from 'lib/types/message-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { ReportStore } from 'lib/types/report-types';
import type { ConnectionInfo } from 'lib/types/socket-types';
import type { ThreadStore } from 'lib/types/thread-types';
import type { CurrentUserInfo, UserStore } from 'lib/types/user-types';
import { setNewSessionActionType } from 'lib/utils/action-utils';

import { activeThreadSelector } from '../selectors/nav-selectors';
import { type NavInfo, updateNavInfoActionType } from '../types/nav-types';
import {
  updateWindowActiveActionType,
  setDeviceIDActionType,
} from './action-types';
import { reduceDeviceID } from './device-id-reducer';
import reduceNavInfo from './nav-reducer';
import { getVisibility } from './visibility';

export type WindowDimensions = { width: number, height: number };
export type AppState = {
  navInfo: NavInfo,
  deviceID: ?string,
  currentUserInfo: ?CurrentUserInfo,
  sessionID: ?string,
  entryStore: EntryStore,
  threadStore: ThreadStore,
  userStore: UserStore,
  messageStore: MessageStore,
  updatesCurrentAsOf: number,
  loadingStatuses: { [key: string]: { [idx: number]: LoadingStatus } },
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
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
  timeZone: ?string,
  userAgent: ?string,
  dataLoaded: boolean,
  windowActive: boolean,
  _persist: ?PersistState,
};

export const updateWindowDimensions = 'UPDATE_WINDOW_DIMENSIONS';

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
    };

export function reducer(oldState: AppState | void, action: Action): AppState {
  invariant(oldState, 'should be set');
  let state = oldState;

  if (action.type === updateWindowDimensions) {
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
    action.type !== setDeviceIDActionType
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
