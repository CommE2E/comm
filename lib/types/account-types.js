// @flow

import type { SignedIdentityKeysBlob } from './crypto-types.js';
import type { PlatformDetails } from './device-types.js';
import type {
  CalendarQuery,
  CalendarResult,
  RawEntryInfo,
} from './entry-types.js';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
  GenericMessagesResult,
} from './message-types.js';
import type { PreRequestUserState } from './session-types.js';
import type { RawThreadInfo } from './thread-types.js';
import type {
  UserInfo,
  LoggedOutUserInfo,
  LoggedInUserInfo,
  OldLoggedInUserInfo,
} from './user-types.js';
import type { PolicyType } from '../facts/policies.js';
import { values } from '../utils/objects.js';

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
  +primaryIdentityPublicKey?: string,
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
  +password: ?string,
};

export const logInActionSources = Object.freeze({
  cookieInvalidationResolutionAttempt: 'COOKIE_INVALIDATION_RESOLUTION_ATTEMPT',
  appStartCookieLoggedInButInvalidRedux:
    'APP_START_COOKIE_LOGGED_IN_BUT_INVALID_REDUX',
  appStartReduxLoggedInButInvalidCookie:
    'APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE',
  socketAuthErrorResolutionAttempt: 'SOCKET_AUTH_ERROR_RESOLUTION_ATTEMPT',
  sqliteOpFailure: 'SQLITE_OP_FAILURE',
  sqliteLoadFailure: 'SQLITE_LOAD_FAILURE',
  logInFromWebForm: 'LOG_IN_FROM_WEB_FORM',
  logInFromNativeForm: 'LOG_IN_FROM_NATIVE_FORM',
  logInFromNativeSIWE: 'LOG_IN_FROM_NATIVE_SIWE',
  corruptedDatabaseDeletion: 'CORRUPTED_DATABASE_DELETION',
  refetchUserDataAfterAcknowledgment: 'REFETCH_USER_DATA_AFTER_ACKNOWLEDGMENT',
});

export type LogInActionSource = $Values<typeof logInActionSources>;

export type LogInStartingPayload = {
  +calendarQuery: CalendarQuery,
  +logInActionSource?: LogInActionSource,
};

export type LogInExtraInfo = {
  +calendarQuery: CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +primaryIdentityPublicKey?: string,
  +signedIdentityKeysBlob?: SignedIdentityKeysBlob,
};

export type LogInInfo = {
  ...LogInExtraInfo,
  +username: string,
  +password: string,
  +logInActionSource: LogInActionSource,
};

export type LogInRequest = {
  +usernameOrEmail?: ?string,
  +username?: ?string,
  +password: string,
  +calendarQuery?: ?CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +platformDetails: PlatformDetails,
  +watchedIDs: $ReadOnlyArray<string>,
  +source?: LogInActionSource,
  +signedIdentityKeysBlob?: SignedIdentityKeysBlob,
};

export type LogInResponse = {
  +currentUserInfo: LoggedInUserInfo | OldLoggedInUserInfo,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +rawEntryInfos?: ?$ReadOnlyArray<RawEntryInfo>,
  +serverTime: number,
  +cookieChange: {
    +threadInfos: { +[id: string]: RawThreadInfo },
    +userInfos: $ReadOnlyArray<UserInfo>,
  },
  +notAcknowledgedPolicies?: $ReadOnlyArray<PolicyType>,
};

export type LogInResult = {
  +threadInfos: { +[id: string]: RawThreadInfo },
  +currentUserInfo: LoggedInUserInfo,
  +messagesResult: GenericMessagesResult,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +calendarResult: CalendarResult,
  +updatesCurrentAsOf: number,
  +logInActionSource: LogInActionSource,
  +notAcknowledgedPolicies?: $ReadOnlyArray<PolicyType>,
};

export type UpdatePasswordRequest = {
  code: string,
  password: string,
  calendarQuery?: ?CalendarQuery,
  deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  platformDetails: PlatformDetails,
  watchedIDs: $ReadOnlyArray<string>,
};

export type PolicyAcknowledgmentRequest = {
  +policy: PolicyType,
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

export const notificationTypeValues: $ReadOnlyArray<NotificationTypes> =
  values(notificationTypes);
