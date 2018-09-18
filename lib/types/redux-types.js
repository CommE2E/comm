// @flow

import type {
  ThreadStore,
  ChangeThreadSettingsResult,
  LeaveThreadPayload,
  NewThreadResult,
  ThreadJoinPayload,
} from './thread-types';
import type {
  RawEntryInfo,
  EntryStore,
  CalendarQuery,
  SaveEntryPayload,
  CreateEntryPayload,
  DeleteEntryPayload,
  RestoreEntryPayload,
  FetchEntryInfosResult,
  CalendarResult,
  CalendarQueryUpdateResult,
} from './entry-types';
import type { LoadingStatus, LoadingInfo } from './loading-types';
import type { BaseNavInfo } from './nav-types';
import type {
  CurrentUserInfo,
  UserInfo,
} from './user-types';
import type {
  LogOutResult,
  LogInStartingPayload,
  LogInResult,
  RegisterResult,
} from './account-types';
import type { UserSearchResult } from '../types/search-types';
import type {
  PingStartingPayload,
  PingResult,
  PingTimestamps,
} from './ping-types';
import type {
  MessageStore,
  RawTextMessageInfo,
  RawMessageInfo,
  FetchMessageInfosPayload,
  SendTextMessagePayload,
  SaveMessagesPayload,
} from './message-types';
import type { SessionChange } from './session-types';
import type { UpdateActivityResult } from './activity-types';
import type { ReportCreationResponse } from './report-types';
import type { ServerRequest } from './request-types';
import type {
  CalendarFilter,
  CalendarThreadFilter,
  SetCalendarDeletedFilterPayload,
} from './filter-types';
import type { SubscriptionUpdateResult } from '../types/subscription-types';

export type BaseAppState<NavInfo: BaseNavInfo> = {
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  entryStore: EntryStore,
  threadStore: ThreadStore,
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  drafts: {[key: string]: string},
  updatesCurrentAsOf: number, // millisecond timestamp
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  pingTimestamps: PingTimestamps,
  activeServerRequests: $ReadOnlyArray<ServerRequest>,
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  urlPrefix: string,
};

// Web JS runtime doesn't have access to the cookie for security reasons.
// Native JS doesn't have a sessionID because the cookieID is used instead.
// Web JS doesn't have a device token because it's not a device...
export type AppState = BaseAppState<*> & (
  | { sessionID?: void, deviceToken: ?string, cookie: ?string }
  | { sessionID: ?string, deviceToken?: void, cookie?: void }
);

export type BaseAction =
  {| type: "@@redux/INIT" |} | {|
    type: "FETCH_ENTRIES_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_SUCCESS",
    payload: FetchEntryInfosResult,
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
    type: "CREATE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CREATE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CREATE_ENTRY_SUCCESS",
    payload: CreateEntryPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SAVE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SAVE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SAVE_ENTRY_SUCCESS",
    payload: SaveEntryPayload,
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
    |},
  |} | {|
    type: "DELETE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_ENTRY_SUCCESS",
    payload: ?DeleteEntryPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_IN_STARTED",
    loadingInfo: LoadingInfo,
    payload: LogInStartingPayload,
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
    payload: LogInStartingPayload,
  |} | {|
    type: "REGISTER_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REGISTER_SUCCESS",
    payload: RegisterResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESET_PASSWORD_STARTED",
    payload: {| calendarQuery: CalendarQuery |},
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
    payload: ChangeThreadSettingsResult,
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
    payload: LeaveThreadPayload,
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
    type: "REMOVE_USERS_FROM_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REMOVE_USERS_FROM_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REMOVE_USERS_FROM_THREAD_SUCCESS",
    payload: ChangeThreadSettingsResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_MEMBER_ROLES_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_MEMBER_ROLES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_MEMBER_ROLES_SUCCESS",
    payload: ChangeThreadSettingsResult,
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
  |} | {|
    type: "RESTORE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESTORE_ENTRY_SUCCESS",
    payload: RestoreEntryPayload,
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
    payload: ThreadJoinPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LEAVE_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LEAVE_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LEAVE_THREAD_SUCCESS",
    payload: LeaveThreadPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_NEW_SESSION",
    payload: SessionChange,
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
    payload: PingResult,
    loadingInfo: LoadingInfo,
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
    payload: BaseAppState<*>,
  |} | {|
    type: "FETCH_MESSAGES_BEFORE_CURSOR_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MESSAGES_BEFORE_CURSOR_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS",
    payload: FetchMessageInfosPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MOST_RECENT_MESSAGES_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MOST_RECENT_MESSAGES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MOST_RECENT_MESSAGES_SUCCESS",
    payload: FetchMessageInfosPayload,
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
    payload: SendTextMessagePayload,
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
    payload: UserSearchResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SAVE_DRAFT",
    payload: {
      key: string,
      draft: string,
    },
  |} | {|
    type: "UPDATE_ACTIVITY_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "UPDATE_ACTIVITY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "UPDATE_ACTIVITY_SUCCESS",
    payload: UpdateActivityResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_DEVICE_TOKEN_STARTED",
    payload: string,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_DEVICE_TOKEN_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_DEVICE_TOKEN_SUCCESS",
    payload: string,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "HANDLE_VERIFICATION_CODE_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "HANDLE_VERIFICATION_CODE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "HANDLE_VERIFICATION_CODE_SUCCESS",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEND_REPORT_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEND_REPORT_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEND_REPORT_SUCCESS",
    payload: ReportCreationResponse,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_URL_PREFIX",
    payload: string,
  |} | {|
    type: "SAVE_MESSAGES",
    payload: SaveMessagesPayload,
  |} | {|
    type: "UPDATE_CALENDAR_THREAD_FILTER",
    payload: CalendarThreadFilter,
  |} | {|
    type: "CLEAR_CALENDAR_THREAD_FILTER",
  |} | {|
    type: "SET_CALENDAR_DELETED_FILTER",
    payload: SetCalendarDeletedFilterPayload,
  |} | {|
    type: "UPDATE_SUBSCRIPTION_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "UPDATE_SUBSCRIPTION_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "UPDATE_SUBSCRIPTION_SUCCESS",
    payload: SubscriptionUpdateResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "UPDATE_CALENDAR_QUERY_STARTED",
    loadingInfo: LoadingInfo,
    payload?: {| calendarQuery?: CalendarQuery |},
  |} | {|
    type: "UPDATE_CALENDAR_QUERY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "UPDATE_CALENDAR_QUERY_SUCCESS",
    payload: CalendarQueryUpdateResult,
    loadingInfo: LoadingInfo,
  |};

export type ActionPayload
  = ?(Object | Array<*> | $ReadOnlyArray<*> | string);
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
  ((action: SuperAction) => bool);

export const rehydrateActionType = "persist/REHYDRATE";
