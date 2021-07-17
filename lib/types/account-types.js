// @flow

import type { PlatformDetails, DeviceType } from './device-types';
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
import type { PreRequestUserState } from './session-types';
import type { RawThreadInfo } from './thread-types';
import type {
  UserInfo,
  LoggedOutUserInfo,
  LoggedInUserInfo,
  OldLoggedInUserInfo,
} from './user-types';

export type ResetPasswordRequest = {
  +usernameOrEmail: string,
};

export type LogOutResult = {
  +currentUserInfo: ?LoggedOutUserInfo,
  +preRequestUserState: PreRequestUserState,
};

export type LogOutResponse = {
  +currentUserInfo: LoggedOutUserInfo,
};

export type RegisterInfo = {
  ...LogInExtraInfo,
  +username: string,
  +password: string,
};

type DeviceTokenUpdateRequest = {
  +deviceToken: string,
};

export type RegisterRequest = {
  +username: string,
  +password: string,
  +calendarQuery?: ?CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +platformDetails: PlatformDetails,
};

export type RegisterResponse = {
  id: string,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  cookieChange: {
    threadInfos: { +[id: string]: RawThreadInfo },
    userInfos: $ReadOnlyArray<UserInfo>,
  },
};

export type RegisterResult = {
  +currentUserInfo: LoggedInUserInfo,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +threadInfos: { +[id: string]: RawThreadInfo },
  +userInfos: $ReadOnlyArray<UserInfo>,
  +calendarQuery: CalendarQuery,
};

export type DeleteAccountRequest = {
  +password: string,
};

export type LogInActionSource =
  | 'COOKIE_INVALIDATION_RESOLUTION_ATTEMPT'
  | 'APP_START_NATIVE_CREDENTIALS_AUTO_LOG_IN'
  | 'APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE'
  | 'SOCKET_AUTH_ERROR_RESOLUTION_ATTEMPT';
export type LogInStartingPayload = {
  +calendarQuery: CalendarQuery,
  +source?: LogInActionSource,
};

export type LogInExtraInfo = {
  +calendarQuery: CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
};

export type LogInInfo = {
  ...LogInExtraInfo,
  +username: string,
  +password: string,
  +source?: ?LogInActionSource,
};

export type LogInRequest = {
  +usernameOrEmail?: ?string,
  +username?: ?string,
  +password: string,
  +calendarQuery?: ?CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +platformDetails: PlatformDetails,
  +watchedIDs: $ReadOnlyArray<string>,
};

export type LogInResponse = {
  currentUserInfo: LoggedInUserInfo | OldLoggedInUserInfo,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatuses: MessageTruncationStatuses,
  userInfos: $ReadOnlyArray<UserInfo>,
  rawEntryInfos?: ?$ReadOnlyArray<RawEntryInfo>,
  serverTime: number,
  cookieChange: {
    threadInfos: { +[id: string]: RawThreadInfo },
    userInfos: $ReadOnlyArray<UserInfo>,
  },
};

export type LogInResult = {
  +threadInfos: { +[id: string]: RawThreadInfo },
  +currentUserInfo: LoggedInUserInfo,
  +messagesResult: GenericMessagesResult,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +calendarResult: CalendarResult,
  +updatesCurrentAsOf: number,
  +source?: ?LogInActionSource,
};

export type UpdatePasswordRequest = {
  code: string,
  password: string,
  calendarQuery?: ?CalendarQuery,
  deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  platformDetails: PlatformDetails,
  watchedIDs: $ReadOnlyArray<string>,
};

export type AccessRequest = {
  +email: string,
  +platform: DeviceType,
};

export type EmailSubscriptionRequest = {
  +email: string,
};
