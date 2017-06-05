// @flow

import type { ThreadInfo } from './thread-types';
import type { EntryInfo } from './entry-types';
import type { LoadingStatus, LoadingInfo } from './loading-types';
import type { BaseNavInfo } from './nav-types';
import type { UserInfo } from './user-types';
import type {
  LogInResult,
  LogInStartingPayload,
} from '../actions/user-actions';
import type { AuthThreadResult } from '../actions/thread-actions';
import type {
  PingStartingPayload,
  PingSuccessPayload,
} from '../types/ping-types';
import type { CalendarResult } from '../actions/entry-actions';
import type { CalendarQuery } from '../selectors/nav-selectors';
import type { MessageStore } from './message-types';
import type { PageMessagesResult } from '../actions/message-actions';

export type BaseAppState = {
  // This "+" means that navInfo can be a sub-type of BaseNavInfo. As a result,
  // within lib (where we're handling a generic BaseAppState) we can read
  // navInfo, but we can't set it - otherwise, we may be setting a more specific
  // type to a more general one.
  +navInfo: BaseNavInfo,
  userInfo: ?UserInfo,
  sessionID: string,
  entryInfos: {[id: string]: EntryInfo},
  daysToEntries: {[day: string]: string[]},
  lastUserInteraction: {[section: string]: number},
  threadInfos: {[id: string]: ThreadInfo},
  messageStore: MessageStore,
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
};

export type BaseAction =
  { type: "@@redux/INIT" } | {
    type: "FETCH_ENTRIES_AND_SET_RANGE_STARTED",
    payload?: {
      calendarQuery?: CalendarQuery,
    },
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ENTRIES_AND_SET_RANGE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ENTRIES_AND_SET_RANGE_SUCCESS",
    payload: CalendarResult,
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ENTRIES_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ENTRIES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ENTRIES_SUCCESS",
    payload: EntryInfo[],
    loadingInfo: LoadingInfo,
  } | {
    type: "LOG_OUT_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "LOG_OUT_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "LOG_OUT_SUCCESS",
    payload: {[id: string]: ThreadInfo},
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_ACCOUNT_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_ACCOUNT_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_ACCOUNT_SUCCESS",
    payload: {[id: string]: ThreadInfo},
    loadingInfo: LoadingInfo,
  } | {
    type: "CREATE_LOCAL_ENTRY",
    payload: EntryInfo,
  } | {
    type: "SAVE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {
      newSessionID?: string,
    },
  } | {
    type: "SAVE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "SAVE_ENTRY_SUCCESS",
    payload: {
      localID: ?string,
      serverID: string,
      text: string,
    },
    loadingInfo: LoadingInfo,
  } | {
    type: "CONCURRENT_MODIFICATION_RESET",
    payload: {
      id: string,
      dbText: string,
    },
  } | {
    type: "DELETE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {
      localID: ?string,
      serverID: ?string,
      newSessionID?: string,
    },
  } | {
    type: "DELETE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_ENTRY_SUCCESS",
    loadingInfo: LoadingInfo,
  } | {
    type: "LOG_IN_STARTED",
    loadingInfo: LoadingInfo,
    payload?: LogInStartingPayload,
  } | {
    type: "LOG_IN_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "LOG_IN_SUCCESS",
    payload: LogInResult,
    loadingInfo: LoadingInfo,
  } | {
    type: "REGISTER_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "REGISTER_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "REGISTER_SUCCESS",
    payload: UserInfo,
    loadingInfo: LoadingInfo,
  } | {
    type: "RESET_PASSWORD_STARTED",
    payload?: {
      calendarQuery?: CalendarQuery,
    },
    loadingInfo: LoadingInfo,
  } | {
    type: "RESET_PASSWORD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "RESET_PASSWORD_SUCCESS",
    payload: LogInResult,
    loadingInfo: LoadingInfo,
  } | {
    type: "FORGOT_PASSWORD_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "FORGOT_PASSWORD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "FORGOT_PASSWORD_SUCCESS",
    loadingInfo: LoadingInfo,
  } | {
    type: "CHANGE_USER_SETTINGS_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "CHANGE_USER_SETTINGS_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "CHANGE_USER_SETTINGS_SUCCESS",
    payload: {
      email: string,
    },
    loadingInfo: LoadingInfo,
  } | {
    type: "RESEND_VERIFICATION_EMAIL_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "RESEND_VERIFICATION_EMAIL_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "RESEND_VERIFICATION_EMAIL_SUCCESS",
    loadingInfo: LoadingInfo,
  } | {
    type: "CHANGE_THREAD_SETTINGS_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "CHANGE_THREAD_SETTINGS_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "CHANGE_THREAD_SETTINGS_SUCCESS",
    payload: ThreadInfo,
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "DELETE_THREAD_SUCCESS",
    payload: string,
    loadingInfo: LoadingInfo,
  } | {
    type: "NEW_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "NEW_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "NEW_THREAD_SUCCESS",
    payload: ThreadInfo,
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_REVISIONS_FOR_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_REVISIONS_FOR_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_REVISIONS_FOR_ENTRY_SUCCESS",
    payload: {
      entryID: string,
      text: string,
      deleted: bool,
    },
    loadingInfo: LoadingInfo,
  } | {
    type: "RESTORE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {
      newSessionID?: string,
    },
  } | {
    type: "RESTORE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "RESTORE_ENTRY_SUCCESS",
    payload: string, // entryID
    loadingInfo: LoadingInfo,
  } | {
    type: "AUTH_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "AUTH_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "AUTH_THREAD_SUCCESS",
    payload: AuthThreadResult,
    loadingInfo: LoadingInfo,
  } | {
    type: "SUBSCRIBED_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "SUBSCRIBE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "SUBSCRIBE_SUCCESS",
    payload: {
      threadID: string,
      newSubscribed: bool,
    },
    loadingInfo: LoadingInfo,
  } | {
    type: "SET_COOKIE",
    payload: {
      cookie: ?string,
      // We make sure the server includes threadInfos in any response that
      // triggers this action. This is here (instead of in the _SUCCESS action
      // corresponding to the async call) because any endpoint can trigger a
      // cookie invalidation. However, most SET_COOKIE actions aren't cookie
      // invalidations; more commonly, SET_COOKIE gets dispatched as a
      // consequence of other actions, such as a log in. In those cases, the
      // _SUCCESS action (eg. LOG_IN_SUCCESS) will also have the ThreadInfos
      // (and a UserInfo) in its payload, but note that SET_COOKIE will get
      // triggered first. The reducer for the _SUCCESS action should thus do a
      // deep (recursive) equality check before setting ThreadInfos. UserInfo
      // isn't included in the SET_COOKIE payload because we know cookie
      // invalidations correspond to null userInfos, and in all other cases of
      // cookies being changed, the _SUCCESS action will handle the UserInfo.
      threadInfos?: {[id: string]: ThreadInfo},
      // Whether a user triggered this SET_COOKIE action or it's the result of
      // a cookie invalidation
      cookieInvalidated?: bool,
    },
  } | {
    type: "PING_STARTED",
    payload: PingStartingPayload,
    loadingInfo: LoadingInfo,
  } | {
    type: "PING_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "PING_SUCCESS",
    payload: PingSuccessPayload,
    loadingInfo: LoadingInfo,
  } | {
    type: "NEW_SESSION_ID",
    payload: string,
  } | {
    type: "FETCH_ENTRIES_AND_APPEND_RANGE_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ENTRIES_AND_APPEND_RANGE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_ENTRIES_AND_APPEND_RANGE_SUCCESS",
    payload: CalendarResult,
    loadingInfo: LoadingInfo,
  } | {
    type: "persist/REHYDRATE",
    payload: BaseAppState,
  } | {
    type: "FETCH_MESSAGES_STARTED",
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_MESSAGES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  } | {
    type: "FETCH_MESSAGES_SUCCESS",
    payload: PageMessagesResult,
    loadingInfo: LoadingInfo,
  };

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
