// @flow

import type { RawThreadInfo } from './thread-types';
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
  ChangeThreadSettingsResult,
  LeaveThreadResult,
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
import type {
  MessageStore,
  RawTextMessageInfo,
  RawMessageInfo,
} from './message-types';
import type { PageMessagesResult } from '../actions/message-actions';
import type { SetCookiePayload } from '../utils/action-utils';
import type { UpdateActivityResult } from '../types/activity-types';

import { setCookieActionType } from '../utils/action-utils';
import {
  fetchEntriesActionTypes,
  fetchEntriesAndSetRangeActionTypes,
  createLocalEntryActionType,
  saveEntryActionTypes,
  concurrentModificationResetActionType,
  deleteEntryActionTypes,
  fetchRevisionsForEntryActionTypes,
  restoreEntryActionTypes,
  fetchEntriesAndAppendRangeActionTypes,
} from '../actions/entry-actions';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
  resetPasswordActionTypes,
  forgotPasswordActionTypes,
  changeUserSettingsActionTypes,
  resendVerificationEmailActionTypes,
  searchUsersActionTypes,
} from '../actions/user-actions';
import {
  changeThreadSettingsActionTypes,
  deleteThreadActionTypes,
  newThreadActionTypes,
  addUsersToThreadActionTypes,
  removeUsersFromThreadActionTypes,
  changeThreadMemberRolesActionTypes,
  joinThreadActionTypes,
  leaveThreadActionTypes,
  subscribeActionTypes,
} from '../actions/thread-actions';
import {
  pingActionTypes,
  updateActivityActionTypes,
} from '../actions/ping-actions';
import { newSessionIDActionType } from '../reducers/session-reducer';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMostRecentMessagesActionTypes,
  sendMessageActionTypes,
} from '../actions/message-actions';
import { saveDraftActionType } from '../reducers/draft-reducer';
import { setDeviceTokenActionTypes } from '../actions/device-actions';

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
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  drafts: {[key: string]: string},
  currentAsOf: number, // millisecond timestamp
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
  deviceToken: ?string,
};

export type BaseAction =
  {| type: "@@redux/INIT" |} | {|
    type: typeof fetchEntriesAndSetRangeActionTypes.started,
    payload?: {|
      calendarQuery?: CalendarQuery,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchEntriesAndSetRangeActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchEntriesAndSetRangeActionTypes.success,
    payload: CalendarResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchEntriesActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchEntriesActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchEntriesActionTypes.success,
    payload: FetchEntriesResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof logOutActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof logOutActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof logOutActionTypes.success,
    payload: LogOutResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof deleteAccountActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof deleteAccountActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof deleteAccountActionTypes.success,
    payload: LogOutResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof createLocalEntryActionType,
    payload: RawEntryInfo,
  |} | {|
    type: typeof saveEntryActionTypes.started,
    loadingInfo: LoadingInfo,
    payload: {|
      newSessionID?: string,
    |},
  |} | {|
    type: typeof saveEntryActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof saveEntryActionTypes.success,
    payload: {|
      localID: ?string,
      serverID: string,
      text: string,
      newMessageInfos: RawMessageInfo[],
      threadID: string,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof concurrentModificationResetActionType,
    payload: {|
      id: string,
      dbText: string,
    |},
  |} | {|
    type: typeof deleteEntryActionTypes.started,
    loadingInfo: LoadingInfo,
    payload: {|
      localID: ?string,
      serverID: ?string,
      newSessionID?: string,
    |},
  |} | {|
    type: typeof deleteEntryActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof deleteEntryActionTypes.success,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof logInActionTypes.started,
    loadingInfo: LoadingInfo,
    payload?: LogInStartingPayload,
  |} | {|
    type: typeof logInActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof logInActionTypes.success,
    payload: LogInResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof registerActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof registerActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof registerActionTypes.success,
    payload: LoggedInUserInfo,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof resetPasswordActionTypes.started,
    payload?: {|
      calendarQuery?: CalendarQuery,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof resetPasswordActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof resetPasswordActionTypes.success,
    payload: LogInResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof forgotPasswordActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof forgotPasswordActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof forgotPasswordActionTypes.success,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof changeUserSettingsActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof changeUserSettingsActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof changeUserSettingsActionTypes.success,
    payload: {|
      email: string,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof resendVerificationEmailActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof resendVerificationEmailActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof resendVerificationEmailActionTypes.success,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof changeThreadSettingsActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof changeThreadSettingsActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof changeThreadSettingsActionTypes.success,
    payload: ChangeThreadSettingsResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof deleteThreadActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof deleteThreadActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof deleteThreadActionTypes.success,
    payload: string,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof newThreadActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof newThreadActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof newThreadActionTypes.success,
    payload: NewThreadResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof addUsersToThreadActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof addUsersToThreadActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof addUsersToThreadActionTypes.success,
    payload: ChangeThreadSettingsResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof removeUsersFromThreadActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof removeUsersFromThreadActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof removeUsersFromThreadActionTypes.success,
    payload: ChangeThreadSettingsResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof changeThreadMemberRolesActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof changeThreadMemberRolesActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof changeThreadMemberRolesActionTypes.success,
    payload: ChangeThreadSettingsResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchRevisionsForEntryActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchRevisionsForEntryActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchRevisionsForEntryActionTypes.success,
    payload: {|
      entryID: string,
      text: string,
      deleted: bool,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof restoreEntryActionTypes.started,
    loadingInfo: LoadingInfo,
    payload: {|
      newSessionID?: string,
    |},
  |} | {|
    type: typeof restoreEntryActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof restoreEntryActionTypes.success,
    payload: string, // entryID
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof joinThreadActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof joinThreadActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof joinThreadActionTypes.success,
    payload: JoinThreadResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof leaveThreadActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof leaveThreadActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof leaveThreadActionTypes.success,
    payload: LeaveThreadResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof subscribeActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof subscribeActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof subscribeActionTypes.success,
    payload: JoinThreadResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof setCookieActionType,
    payload: SetCookiePayload,
  |} | {|
    type: typeof pingActionTypes.started,
    payload: PingStartingPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof pingActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof pingActionTypes.success,
    payload: PingSuccessPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof newSessionIDActionType,
    payload: string,
  |} | {|
    type: typeof fetchEntriesAndAppendRangeActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchEntriesAndAppendRangeActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchEntriesAndAppendRangeActionTypes.success,
    payload: CalendarResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof rehydrateActionType,
    payload: BaseAppState,
  |} | {|
    type: typeof fetchMessagesBeforeCursorActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchMessagesBeforeCursorActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchMessagesBeforeCursorActionTypes.success,
    payload: PageMessagesResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchMostRecentMessagesActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchMostRecentMessagesActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof fetchMostRecentMessagesActionTypes.success,
    payload: PageMessagesResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof sendMessageActionTypes.started,
    loadingInfo: LoadingInfo,
    payload: RawTextMessageInfo,
  |} | {|
    type: typeof sendMessageActionTypes.failed,
    error: true,
    payload: Error & {
      localID: string,
      threadID: string,
    },
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof sendMessageActionTypes.success,
    payload: {|
      localID: string,
      serverID: string,
      threadID: string,
      time: number,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof searchUsersActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof searchUsersActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof searchUsersActionTypes.success,
    payload: SearchUsersResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof saveDraftActionType,
    payload: {
      key: string,
      draft: string,
    },
  |} | {|
    type: typeof updateActivityActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof updateActivityActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof updateActivityActionTypes.success,
    payload: UpdateActivityResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof setDeviceTokenActionTypes.started,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof setDeviceTokenActionTypes.failed,
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: typeof setDeviceTokenActionTypes.success,
    payload: string,
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
  ((action: SuperAction) => bool);

export const rehydrateActionType = "persist/REHYDRATE";
