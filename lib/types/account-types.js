// @flow

import { values } from '../utils/objects';
import type { PlatformDetails } from './device-types';
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
  currentUserInfo: OldLoggedInUserInfo | LoggedInUserInfo,
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

export const loginActionSources = Object.freeze({
  cookieInvalidationResolutionAttempt: 'COOKIE_INVALIDATION_RESOLUTION_ATTEMPT',
  appStartCookieLoggedInButInvalidRedux:
    'APP_START_COOKIE_LOGGED_IN_BUT_INVALID_REDUX',
  appStartReduxLoggedInButInvalidCookie:
    'APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE',
  socketAuthErrorResolutionAttempt: 'SOCKET_AUTH_ERROR_RESOLUTION_ATTEMPT',
  sqliteOpFailure: 'SQLITE_OP_FAILURE',
  sqliteLoadFailure: 'SQLITE_LOAD_FAILURE',
});

export type LogInActionSource = $Values<typeof loginActionSources>;

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

export type EmailSubscriptionRequest = {
  +email: string,
};
export type UpdateUserSettingsRequest = {
  +name: 'default_user_notifications',
  +data: NotificationTypes,
};

export const userSettingsTypes = Object.freeze({
  DEFAULT_NOTIFICATIONS: 'default_user_notifications',
});

export type DefaultNotificationPayload = {
  +default_user_notifications: ?NotificationTypes,
};

export const notificationTypes = Object.freeze({
  FOCUSED: 'focused',
  BADGE_ONLY: 'badge_only',
  BACKGROUND: 'background',
});

export type NotificationTypes = $Values<typeof notificationTypes>;

export const notificationTypeValues: $ReadOnlyArray<NotificationTypes> = values(
  notificationTypes,
);
