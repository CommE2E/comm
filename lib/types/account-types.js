// @flow

import t, { type TInterface } from 'tcomb';

import type { SignedIdentityKeysBlob } from './crypto-types.js';
import type { PlatformDetails } from './device-types.js';
import type {
  CalendarQuery,
  CalendarResult,
  RawEntryInfo,
} from './entry-types.js';
import {
  type RawMessageInfo,
  type MessageTruncationStatuses,
  type GenericMessagesResult,
} from './message-types.js';
import type {
  PreRequestUserState,
  IdentityCallPreRequestUserState,
} from './session-types.js';
import {
  type MixedRawThreadInfos,
  type RawThreadInfos,
} from './thread-types.js';
import type {
  CurrentUserInfo,
  UserInfo,
  LoggedOutUserInfo,
  LoggedInUserInfo,
} from './user-types';
import type { PolicyType } from '../facts/policies.js';
import { values } from '../utils/objects.js';
import { tShape } from '../utils/validation-utils.js';

export type ResetPasswordRequest = {
  +usernameOrEmail: string,
};

export type LogOutResult = {
  +currentUserInfo: ?LoggedOutUserInfo,
  +preRequestUserState: IdentityCallPreRequestUserState,
};

export type KeyserverLogOutResult = $ReadOnly<{
  +currentUserInfo: ?LoggedOutUserInfo,
  +preRequestUserState: PreRequestUserState,
  +keyserverIDs: $ReadOnlyArray<string>,
}>;

export type LogOutResponse = {
  +currentUserInfo: LoggedOutUserInfo,
};

export type DeviceTokenUpdateRequest = {
  +deviceToken: string,
};

type DeviceTokenUpdateInput = {
  +[keyserverID: string]: DeviceTokenUpdateRequest,
};

export type RegisterRequest = {
  +username: string,
  +email?: empty,
  +password: string,
  +calendarQuery?: ?CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +platformDetails: PlatformDetails,
  +primaryIdentityPublicKey?: empty,
  +signedIdentityKeysBlob?: SignedIdentityKeysBlob,
  +initialNotificationsEncryptedMessage?: string,
};

export type RegisterResponse = {
  +id: string,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +currentUserInfo: LoggedInUserInfo,
  +cookieChange: {
    +threadInfos: MixedRawThreadInfos,
    +userInfos: $ReadOnlyArray<UserInfo>,
  },
};

export const recoveryFromReduxActionSources = Object.freeze({
  cookieInvalidationResolutionAttempt: 'COOKIE_INVALIDATION_RESOLUTION_ATTEMPT',
  appStartCookieLoggedInButInvalidRedux:
    'APP_START_COOKIE_LOGGED_IN_BUT_INVALID_REDUX',
  appStartReduxLoggedInButInvalidCookie:
    'APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE',
  socketAuthErrorResolutionAttempt: 'SOCKET_AUTH_ERROR_RESOLUTION_ATTEMPT',
  // The below type is deprecated, but we can't remove it here as it's used for
  // input validation on the keyserver, and we don't want to break support for
  // older clients
  refetchUserDataAfterAcknowledgment: 'REFETCH_USER_DATA_AFTER_ACKNOWLEDGMENT',
  socketNotLoggedIn: 'SOCKET_NOT_LOGGED_IN',
});

export type RecoveryFromReduxActionSource = $Values<
  typeof recoveryFromReduxActionSources,
>;

export const recoveryFromDataHandlerActionSources = Object.freeze({
  //sqliteOpFailure: 'SQLITE_OP_FAILURE', (DEPRECATED)
  sqliteLoadFailure: 'SQLITE_LOAD_FAILURE',
  corruptedDatabaseDeletion: 'CORRUPTED_DATABASE_DELETION',
});

export type RecoveryFromDataHandlerActionSource = $Values<
  typeof recoveryFromDataHandlerActionSources,
>;

export type RecoveryActionSource =
  | RecoveryFromReduxActionSource
  | RecoveryFromDataHandlerActionSource;

export const logInActionSources = Object.freeze({
  logInFromWebForm: 'LOG_IN_FROM_WEB_FORM',
  logInFromNativeForm: 'LOG_IN_FROM_NATIVE_FORM',
  logInFromNativeSIWE: 'LOG_IN_FROM_NATIVE_SIWE',
  keyserverAuthFromNative: 'KEYSERVER_AUTH_FROM_NATIVE',
  keyserverAuthFromWeb: 'KEYSERVER_AUTH_FROM_WEB',
});

export type LogInActionSource = $Values<typeof logInActionSources>;

export const authActionSources = Object.freeze({
  ...recoveryFromReduxActionSources,
  ...recoveryFromDataHandlerActionSources,
  ...logInActionSources,
});

export type AuthActionSource = LogInActionSource | RecoveryActionSource;

export type LegacyLogInStartingPayload = {
  +calendarQuery: CalendarQuery,
  +authActionSource?: AuthActionSource,
};

export type LegacyLogInExtraInfo = {
  +calendarQuery: CalendarQuery,
  +deviceTokenUpdateRequest: DeviceTokenUpdateInput,
  +signedIdentityKeysBlob?: SignedIdentityKeysBlob,
  +initialNotificationsEncryptedMessage?: string,
  +preRequestUserInfo: ?CurrentUserInfo,
};

export type LegacyLogInInfo = {
  ...LegacyLogInExtraInfo,
  +username: string,
  +password: string,
  +authActionSource: AuthActionSource,
  +keyserverIDs?: $ReadOnlyArray<string>,
};

export type LogInRequest = {
  +usernameOrEmail?: ?string,
  +username?: ?string,
  +password: string,
  +calendarQuery?: ?CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +platformDetails: PlatformDetails,
  +watchedIDs: $ReadOnlyArray<string>,
  +source?: AuthActionSource,
  +primaryIdentityPublicKey?: empty,
  +signedIdentityKeysBlob?: SignedIdentityKeysBlob,
  +initialNotificationsEncryptedMessage?: string,
};

export type ServerLogInResponse = {
  +currentUserInfo: LoggedInUserInfo,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +rawEntryInfos?: ?$ReadOnlyArray<RawEntryInfo>,
  +serverTime: number,
  +cookieChange: {
    +threadInfos: MixedRawThreadInfos,
    +userInfos: $ReadOnlyArray<UserInfo>,
  },
  +notAcknowledgedPolicies?: $ReadOnlyArray<PolicyType>,
};

export type ClientLogInResponse = $ReadOnly<{
  ...ServerLogInResponse,
  +cookieChange: $ReadOnly<{
    ...$PropertyType<ServerLogInResponse, 'cookieChange'>,
    threadInfos: RawThreadInfos,
  }>,
}>;

export type LegacyLogInResult = {
  +threadInfos: RawThreadInfos,
  +currentUserInfo: LoggedInUserInfo,
  +messagesResult: GenericMessagesResult,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +calendarResult: CalendarResult,
  +updatesCurrentAsOf: { +[keyserverID: string]: number },
  +authActionSource: AuthActionSource,
  +notAcknowledgedPolicies?: $ReadOnlyArray<PolicyType>,
  +preRequestUserInfo: ?CurrentUserInfo,
};

export type KeyserverAuthResult = {
  +threadInfos: RawThreadInfos,
  +currentUserInfo?: ?LoggedInUserInfo,
  +messagesResult: GenericMessagesResult,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +calendarResult: CalendarResult,
  +updatesCurrentAsOf: { +[keyserverID: string]: number },
  +authActionSource: AuthActionSource,
  +notAcknowledgedPolicies?: ?$ReadOnlyArray<PolicyType>,
  +preRequestUserInfo: ?CurrentUserInfo,
};

type KeyserverRequestData = {
  +initialContentEncryptedMessage: string,
  +initialNotificationsEncryptedMessage: string,
};

export type KeyserverAuthInfo = {
  +userID: string,
  +deviceID: string,
  +doNotRegister: boolean,
  +calendarQuery: CalendarQuery,
  +deviceTokenUpdateInput: DeviceTokenUpdateInput,
  +authActionSource: AuthActionSource,
  +keyserverData: { +[keyserverID: string]: KeyserverRequestData },
};

export type ClientKeyserverAuthRequest = $ReadOnly<{
  ...KeyserverRequestData,
  +userID: string,
  +deviceID: string,
  +doNotRegister: boolean,
  +calendarQuery: CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +watchedIDs: $ReadOnlyArray<string>,
  +platformDetails: PlatformDetails,
  +source?: AuthActionSource,
}>;

export type ServerKeyserverAuthRequest = $ReadOnly<{
  ...ClientKeyserverAuthRequest,
  +password?: ?string,
}>;

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

export const notificationTypes = Object.freeze({
  FOCUSED: 'focused',
  BADGE_ONLY: 'badge_only',
  BACKGROUND: 'background',
});

export type NotificationTypes = $Values<typeof notificationTypes>;

export const notificationTypeValues: $ReadOnlyArray<NotificationTypes> =
  values(notificationTypes);

export type DefaultNotificationPayload = {
  +default_user_notifications: ?NotificationTypes,
};

export const defaultNotificationPayloadValidator: TInterface<DefaultNotificationPayload> =
  tShape<DefaultNotificationPayload>({
    default_user_notifications: t.maybe(t.enums.of(notificationTypeValues)),
  });

export type ClaimUsernameRequest = {
  +username: string,
  +password: string,
};

export type ClaimUsernameResponse = {
  +message: string,
  +signature: string,
};
