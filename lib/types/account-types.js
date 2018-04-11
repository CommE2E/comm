// @flow

import type { RawThreadInfo } from './thread-types';
import type {
  UserInfo,
  LoggedOutUserInfo,
  LoggedInUserInfo,
} from './user-types';
import type {
  CalendarQuery,
  CalendarResult,
  RawEntryInfo,
} from './entry-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
  GenericMessagesResult,
} from './message-types';
import type { DeviceTokenUpdateRequest, Platform } from './device-types';
import type { UpdateInfo, UpdatesResult } from './update-types';

export type ResetPasswordRequest = {|
  usernameOrEmail: string,
|};

export type LogOutResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: $ReadOnlyArray<UserInfo>,
  currentUserInfo: LoggedOutUserInfo,
|};

export type LogOutResponse = {|
  currentUserInfo: LoggedOutUserInfo,
|};

export type RegisterInfo = {|
  username: string,
  email: string,
  password: string,
  platform: Platform,
|};

export type RegisterRequest = {|
  username: string,
  email: string,
  password: string,
  platform?: Platform,
|};

export type RegisterResponse = {|
  id: string,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
|};

export type RegisterResult = {|
  currentUserInfo: LoggedInUserInfo,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: $ReadOnlyArray<UserInfo>,
|};

export type DeleteAccountRequest = {|
  password: string,
|};

export type ChangeUserSettingsResult = {|
  email: ?string,
|};

export type LogInActionSource =
  | "COOKIE_INVALIDATION_RESOLUTION_ATTEMPT"
  | "APP_START_NATIVE_CREDENTIALS_AUTO_LOG_IN"
  | "APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE";
export type LogInStartingPayload = {|
  source?: LogInActionSource,
  calendarQuery?: CalendarQuery,
|};

export type LogInInfo = {|
  usernameOrEmail: string,
  password: string,
  calendarQuery?: ?CalendarQuery,
  deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  platform: Platform,
|};

export type LogInRequest = {|
  usernameOrEmail: string,
  password: string,
  calendarQuery?: ?CalendarQuery,
  deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  platform?: Platform,
  watchedIDs: $ReadOnlyArray<string>,
|};

export type LogInResponse = {|
  currentUserInfo: LoggedInUserInfo,
  rawMessageInfos: RawMessageInfo[],
  truncationStatuses: MessageTruncationStatuses,
  userInfos: $ReadOnlyArray<UserInfo>,
  rawEntryInfos?: ?$ReadOnlyArray<RawEntryInfo>,
  serverTime: number,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
|};

export type LogInResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: LoggedInUserInfo,
  messagesResult: GenericMessagesResult,
  userInfos: UserInfo[],
  calendarResult?: ?CalendarResult,
  updatesResult: UpdatesResult,
|};

export type UpdatePasswordInfo = {|
  code: string,
  password: string,
  calendarQuery?: ?CalendarQuery,
  deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  platform: Platform,
|};

export type UpdatePasswordRequest = {|
  code: string,
  password: string,
  calendarQuery?: ?CalendarQuery,
  deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  platform?: Platform,
  watchedIDs: $ReadOnlyArray<string>,
|};
