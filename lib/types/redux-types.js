// @flow

import type { ThreadInfo } from './thread-types';
import type { RawEntryInfo, EntryStore } from './entry-types';
import type { LoadingStatus, LoadingInfo } from './loading-types';
import type { BaseNavInfo } from './nav-types';
import type { CurrentUserInfo, LoggedInUserInfo, UserInfo } from './user-types';
import type {
  LogOutResult,
  LogInResult,
  LogInStartingPayload,
  SearchUsersResult,
} from '../actions/user-actions';
import type {
  JoinThreadResult,
  NewThreadResult,
} from '../actions/thread-actions';
import type {
  PingStartingPayload,
  PingSuccessPayload,
} from '../types/ping-types';
import type {
  FetchEntriesResult,
  CalendarResult,
} from '../actions/entry-actions';
import type { CalendarQuery } from '../selectors/nav-selectors';
import type { MessageStore, RawTextMessageInfo } from './message-types';
import type { PageMessagesResult } from '../actions/message-actions';
import type { SetCookiePayload } from '../utils/action-utils';

export type BaseAppState = {
  // This "+" means that navInfo can be a sub-type of BaseNavInfo. As a result,
  // within lib (where we're handling a generic BaseAppState) we can read
  // navInfo, but we can't set it - otherwise, we may be setting a more specific
  // type to a more general one.
  +navInfo: BaseNavInfo,
  currentUserInfo: ?CurrentUserInfo,
  sessionID: string,
  entryStore: EntryStore,
  lastUserInteraction: {[section: string]: number},
  threadInfos: {[id: string]: ThreadInfo},
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  currentAsOf: number, // millisecond timestamp
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
};

export type BaseAction =
  {| type: "@@redux/INIT" |} | {|
    type: "FETCH_ENTRIES_AND_SET_RANGE_STARTED",
    payload?: {|
      calendarQuery?: CalendarQuery,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_AND_SET_RANGE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_AND_SET_RANGE_SUCCESS",
    payload: CalendarResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_SUCCESS",
    payload: FetchEntriesResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_OUT_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_OUT_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_OUT_SUCCESS",
    payload: LogOutResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_ACCOUNT_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_ACCOUNT_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_ACCOUNT_SUCCESS",
    payload: LogOutResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CREATE_LOCAL_ENTRY",
    payload: RawEntryInfo,
  |} | {|
    type: "SAVE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {|
      newSessionID?: string,
    |},
  |} | {|
    type: "SAVE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SAVE_ENTRY_SUCCESS",
    payload: {|
      localID: ?string,
      serverID: string,
      text: string,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CONCURRENT_MODIFICATION_RESET",
    payload: {|
      id: string,
      dbText: string,
    |},
  |} | {|
    type: "DELETE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {|
      localID: ?string,
      serverID: ?string,
      newSessionID?: string,
    |},
  |} | {|
    type: "DELETE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_ENTRY_SUCCESS",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_IN_STARTED",
    loadingInfo: LoadingInfo,
    payload?: LogInStartingPayload,
  |} | {|
    type: "LOG_IN_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_IN_SUCCESS",
    payload: LogInResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REGISTER_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REGISTER_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REGISTER_SUCCESS",
    payload: LoggedInUserInfo,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESET_PASSWORD_STARTED",
    payload?: {|
      calendarQuery?: CalendarQuery,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESET_PASSWORD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESET_PASSWORD_SUCCESS",
    payload: LogInResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FORGOT_PASSWORD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FORGOT_PASSWORD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FORGOT_PASSWORD_SUCCESS",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_USER_SETTINGS_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_USER_SETTINGS_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_USER_SETTINGS_SUCCESS",
    payload: {|
      email: string,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESEND_VERIFICATION_EMAIL_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESEND_VERIFICATION_EMAIL_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESEND_VERIFICATION_EMAIL_SUCCESS",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_SETTINGS_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_SETTINGS_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_SETTINGS_SUCCESS",
    payload: ThreadInfo,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_THREAD_SUCCESS",
    payload: string,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "NEW_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "NEW_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "NEW_THREAD_SUCCESS",
    payload: NewThreadResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_REVISIONS_FOR_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_REVISIONS_FOR_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_REVISIONS_FOR_ENTRY_SUCCESS",
    payload: {|
      entryID: string,
      text: string,
      deleted: bool,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESTORE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {|
      newSessionID?: string,
    |},
  |} | {|
    type: "RESTORE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESTORE_ENTRY_SUCCESS",
    payload: string, // entryID
    loadingInfo: LoadingInfo,
  |} | {|
    type: "JOIN_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "JOIN_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "JOIN_THREAD_SUCCESS",
    payload: JoinThreadResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SUBSCRIBED_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SUBSCRIBE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SUBSCRIBE_SUCCESS",
    payload: {|
      threadID: string,
      newSubscribed: bool,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_COOKIE",
    payload: SetCookiePayload,
  |} | {|
    type: "PING_STARTED",
    payload: PingStartingPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "PING_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "PING_SUCCESS",
    payload: PingSuccessPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "NEW_SESSION_ID",
    payload: string,
  |} | {|
    type: "FETCH_ENTRIES_AND_APPEND_RANGE_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_AND_APPEND_RANGE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_AND_APPEND_RANGE_SUCCESS",
    payload: CalendarResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "persist/REHYDRATE",
    payload: BaseAppState,
  |} | {|
    type: "FETCH_MESSAGES_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MESSAGES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MESSAGES_SUCCESS",
    payload: PageMessagesResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEND_MESSAGE_STARTED",
    loadingInfo: LoadingInfo,
    payload: RawTextMessageInfo,
  |} | {|
    type: "SEND_MESSAGE_FAILED",
    error: true,
    payload: Error & {
      localID: string,
      threadID: string,
    },
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEND_MESSAGE_SUCCESS",
    payload: {|
      localID: string,
      serverID: string,
      threadID: string,
      time: number,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEARCH_USERS_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEARCH_USERS_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEARCH_USERS_SUCCESS",
    payload: SearchUsersResult,
    loadingInfo: LoadingInfo,
  |};

export type ActionPayload = ?(Object | Array<*> | string);
export type SuperAction = {
  type: $Subtype<string>,
  payload?: ActionPayload,
  loadingInfo?: LoadingInfo,
  error?: bool,
};
type ThunkedAction = (dispatch: Dispatch) => void;
export type PromisedAction = (dispatch: Dispatch) => Promise<void>;
export type Dispatch =
  ((promisedAction: PromisedAction) => Promise<void>) &
  ((thunkedAction: ThunkedAction) => void) &
  ((action: SuperAction) => void);
