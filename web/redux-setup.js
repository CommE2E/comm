// @flow

import type { BaseNavInfo } from 'lib/types/nav-types';
import type { ThreadStore } from 'lib/types/thread-types';
import type { EntryStore } from 'lib/types/entry-types';
import type { BaseAction } from 'lib/types/redux-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { CurrentUserInfo, UserInfo } from 'lib/types/user-types';
import type { VerifyField } from 'lib/types/verify-types';
import type { MessageStore } from 'lib/types/message-types';
import type { PingTimestamps } from 'lib/types/ping-types';
import type { ServerRequest } from 'lib/types/request-types';
import type { CalendarFilter } from 'lib/types/filter-types';

import PropTypes from 'prop-types';
import invariant from 'invariant';

import baseReducer from 'lib/reducers/master-reducer';
import {
  newThreadActionTypes,
  deleteThreadActionTypes,
} from 'lib/actions/thread-actions';
import { mostRecentReadThreadSelector } from 'lib/selectors/thread-selectors';

import { activeThreadSelector } from './selectors/nav-selectors';

export type NavInfo = {|
  ...$Exact<BaseNavInfo>,
  tab: "calendar" | "chat",
  verify: ?string,
  activeChatThreadID: ?string,
|};

export const navInfoPropType = PropTypes.shape({
  startDate: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
  tab: PropTypes.oneOf(["calendar", "chat"]).isRequired,
  verify: PropTypes.string,
  activeChatThreadID: PropTypes.string,
});

export type WindowDimensions = {| width: number, height: number |};
export type AppState = {|
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  sessionID: string,
  verifyField: ?VerifyField,
  resetPasswordUsername: string,
  entryStore: EntryStore,
  lastUserInteraction: {[section: string]: number},
  threadStore: ThreadStore,
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  drafts: {[key: string]: string},
  updatesCurrentAsOf: number,
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  pingTimestamps: PingTimestamps,
  activeServerRequests: $ReadOnlyArray<ServerRequest>,
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  cookie: ?string,
  deviceToken: ?string,
  urlPrefix: string,
  windowDimensions: WindowDimensions,
|};

export const updateNavInfoActionType = "UPDATE_NAV_INFO";
export const updateWindowDimensions = "UPDATE_WINDOW_DIMENSIONS";

export type Action =
  | BaseAction
  | {| type: "UPDATE_NAV_INFO", payload: NavInfo |}
  | {|
      type: "UPDATE_WINDOW_DIMENSIONS",
      payload: WindowDimensions,
    |};

export function reducer(inputState: AppState | void, action: Action) {
  const oldState = inputState;
  invariant(oldState, "should be set");
  let state = oldState;
  if (action.type === updateNavInfoActionType) {
    state = {
      navInfo: action.payload,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      verifyField: state.verifyField,
      resetPasswordUsername: state.resetPasswordUsername,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadStore: state.threadStore,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      pingTimestamps: state.pingTimestamps,
      activeServerRequests: state.activeServerRequests,
      calendarFilters: state.calendarFilters,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      windowDimensions: state.windowDimensions,
    };
  } else if (action.type === updateWindowDimensions) {
    state = {
      navInfo: state.navInfo,
      currentUserInfo: state.currentUserInfo,
      sessionID: state.sessionID,
      verifyField: state.verifyField,
      resetPasswordUsername: state.resetPasswordUsername,
      entryStore: state.entryStore,
      lastUserInteraction: state.lastUserInteraction,
      threadStore: state.threadStore,
      userInfos: state.userInfos,
      messageStore: state.messageStore,
      drafts: state.drafts,
      updatesCurrentAsOf: state.updatesCurrentAsOf,
      loadingStatuses: state.loadingStatuses,
      pingTimestamps: state.pingTimestamps,
      activeServerRequests: state.activeServerRequests,
      calendarFilters: state.calendarFilters,
      cookie: state.cookie,
      deviceToken: state.deviceToken,
      urlPrefix: state.urlPrefix,
      windowDimensions: action.payload,
    };
  } else {
    state = baseReducer(state, action);
  }
  return validateState(oldState, state);
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

  const oldActiveThread = activeThreadSelector(oldState);
  const activeThread = activeThreadSelector(state);
  if (
    activeThread &&
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
