// @flow

import t, { type TInterface } from 'tcomb';

import { values } from '../utils/objects';
import { tShape, tID } from '../utils/validation-utils';
import type { PlatformDetails, DeviceType } from './device-types';
import {
  type CalendarQuery,
  type RawEntryInfo,
  rawEntryInfoValidator,
} from './entry-types';
import { type CalendarResult } from './entry-types-api';
import {
  type RawMessageInfo,
  rawMessageInfoValidator,
  type MessageTruncationStatuses,
  messageTruncationStatusesValidator,
} from './message-types';
import type { GenericMessagesResult } from './message-types-api';
import type { PreRequestUserState } from './session-types';
import { type RawThreadInfo, rawThreadInfoValidator } from './thread-types';
import {
  type UserInfo,
  userInfoValidator,
  type LoggedOutUserInfo,
  loggedOutUserInfoValidator,
  type LoggedInUserInfo,
  loggedInUserInfoValidator,
  type OldLoggedInUserInfo,
  oldLoggedInUserInfoValidator,
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
export const logOutResponseValidator: TInterface = tShape({
  currentUserInfo: loggedOutUserInfoValidator,
});

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
export const registerResponseValidator: TInterface = tShape({
  id: t.String,
  rawMessageInfos: t.list(rawMessageInfoValidator),
  currentUserInfo: t.union([
    oldLoggedInUserInfoValidator,
    loggedInUserInfoValidator,
  ]),
  cookieChange: tShape({
    threadInfos: t.dict(tID, rawThreadInfoValidator),
    userInfos: t.list(userInfoValidator),
  }),
});

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
  | 'APP_START_COOKIE_LOGGED_IN_BUT_INVALID_REDUX'
  | 'APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE'
  | 'SOCKET_AUTH_ERROR_RESOLUTION_ATTEMPT'
  | 'SQLITE_OP_FAILURE'
  | 'SQLITE_LOAD_FAILURE';

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
export const logInResponseValidator: TInterface = tShape({
  currentUserInfo: t.union([
    loggedInUserInfoValidator,
    oldLoggedInUserInfoValidator,
  ]),
  rawMessageInfos: t.list(rawMessageInfoValidator),
  truncationStatuses: messageTruncationStatusesValidator,
  userInfos: t.list(userInfoValidator),
  rawEntryInfos: t.maybe(t.list(rawEntryInfoValidator)),
  serverTime: t.Number,
  cookieChange: tShape({
    threadInfos: t.dict(tID, rawThreadInfoValidator),
    userInfos: t.list(userInfoValidator),
  }),
});

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
export const defaultNotificationPayloadValidator: TInterface = tShape({
  default_user_notifications: t.maybe(t.enums.of(notificationTypeValues)),
});
