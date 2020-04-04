// @flow

import type { BaseNavInfo } from 'lib/types/nav-types';
import type { ThreadStore } from 'lib/types/thread-types';
import type { EntryStore } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserInfo } from 'lib/types/user-types';
import type { ServerVerificationResult } from 'lib/types/verify-types';
import type { MessageStore } from 'lib/types/message-types';
import type { CalendarFilter } from 'lib/types/filter-types';
import { setNewSessionActionType } from 'lib/utils/action-utils';
import type { ConnectionInfo } from 'lib/types/socket-types';
import type { ClientReportCreationRequest } from 'lib/types/report-types';

import PropTypes from 'prop-types';
import invariant from 'invariant';
import Visibility from 'visibilityjs';

import baseReducer from 'lib/reducers/master-reducer';
import { mostRecentReadThreadSelector } from 'lib/selectors/thread-selectors';
import { invalidSessionDowngrade } from 'lib/shared/account-utils';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from 'lib/actions/user-actions';

import { activeThreadSelector } from './selectors/nav-selectors';

export type NavInfo = {|
  ...$Exact<BaseNavInfo>,
  tab: 'calendar' | 'chat',
  verify: ?string,
  activeChatThreadID: ?string,
|};

export const navInfoPropType = PropTypes.shape({
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  tab: PropTypes.oneOf(['calendar', 'chat']).isRequired,
  verify: PropTypes.string,
  activeChatThreadID: PropTypes.string,
});

export type WindowDimensions = {| width: number, height: number |};
export type AppState = {|
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  sessionID: ?string,
  serverVerificationResult: ?ServerVerificationResult,
  entryStore: EntryStore,
  threadStore: ThreadStore,
  userInfos: { [id: string]: UserInfo },
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
  foreground: boolean,
  nextLocalID: number,
  queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  timeZone: ?string,
  userAgent: ?string,
  dataLoaded: boolean,
|};

export const updateNavInfoActionType = 'UPDATE_NAV_INFO';
export const updateWindowDimensions = 'UPDATE_WINDOW_DIMENSIONS';

export type Action =
  | BaseAction
  | {| type: 'UPDATE_NAV_INFO', payload: NavInfo |}
  | {|
      type: 'UPDATE_WINDOW_DIMENSIONS',
      payload: WindowDimensions,
    |};

export function reducer(oldState: AppState | void, action: Action) {
  invariant(oldState, 'should be set');
  let state = oldState;

  if (action.type === updateNavInfoActionType) {
    return validateState(oldState, {
      ...state,
      navInfo: action.payload,
    });
  } else if (action.type === updateWindowDimensions) {
    return validateState(oldState, {
      ...state,
      windowDimensions: action.payload,
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

  return validateState(oldState, baseReducer(state, action));
}

function validateState(oldState: AppState, state: AppState): AppState {
  if (
    state.navInfo.activeChatThreadID &&
    !state.threadStore.threadInfos[state.navInfo.activeChatThreadID]
  ) {
    // Makes sure the active thread always exists
    state = {
      ...state,
      navInfo: {
        ...state.navInfo,
        activeChatThreadID: mostRecentReadThreadSelector(state),
      },
    };
  }

  const activeThread = activeThreadSelector(state);
  if (
    activeThread &&
    !Visibility.hidden() &&
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
