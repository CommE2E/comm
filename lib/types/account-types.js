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
import type { PreRequestUserState } from './session-types.js';
import {
  type RawThreadInfos,
  type MinimallyEncodedRawThreadInfos,
} from './thread-types.js';
import {
  type UserInfo,
  type LoggedOutUserInfo,
  type LoggedInUserInfo,
} from './user-types.js';
import type { PolicyType } from '../facts/policies.js';
import { values } from '../utils/objects.js';
import { tShape } from '../utils/validation-utils.js';

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
  id: string,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  currentUserInfo: LoggedInUserInfo,
  cookieChange: {
    threadInfos: MinimallyEncodedRawThreadInfos,
    userInfos: $ReadOnlyArray<UserInfo>,
  },
};

export type RegisterResult = {
  +currentUserInfo: LoggedInUserInfo,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +threadInfos: MinimallyEncodedRawThreadInfos,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +calendarQuery: CalendarQuery,
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
  keyserverAuthFromNative: 'KEYSERVER_AUTH_FROM_NATIVE',
  keyserverAuthFromWeb: 'KEYSERVER_AUTH_FROM_WEB',
});

export type LogInActionSource = $Values<typeof logInActionSources>;

export type LogInStartingPayload = {
  +calendarQuery: CalendarQuery,
  +logInActionSource?: LogInActionSource,
};

export type LogInExtraInfo = {
  +calendarQuery: CalendarQuery,
  +deviceTokenUpdateRequest: DeviceTokenUpdateInput,
  +signedIdentityKeysBlob?: SignedIdentityKeysBlob,
  +initialNotificationsEncryptedMessage?: string,
};

export type LogInInfo = {
  ...LogInExtraInfo,
  +username: string,
  +password: string,
  +logInActionSource: LogInActionSource,
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
  +source?: LogInActionSource,
  +primaryIdentityPublicKey?: empty,
  +signedIdentityKeysBlob?: SignedIdentityKeysBlob,
  +initialNotificationsEncryptedMessage?: string,
};

export type LogInResponse = {
  +currentUserInfo: LoggedInUserInfo,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +rawEntryInfos?: ?$ReadOnlyArray<RawEntryInfo>,
  +serverTime: number,
  +cookieChange: {
    +threadInfos: MinimallyEncodedRawThreadInfos,
    +userInfos: $ReadOnlyArray<UserInfo>,
  },
  +notAcknowledgedPolicies?: $ReadOnlyArray<PolicyType>,
};

export type LogInResult = {
  +threadInfos: MinimallyEncodedRawThreadInfos,
  +currentUserInfo: LoggedInUserInfo,
  +messagesResult: GenericMessagesResult,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +calendarResult: CalendarResult,
  +updatesCurrentAsOf: { +[keyserverID: string]: number },
  +logInActionSource: LogInActionSource,
  +notAcknowledgedPolicies?: $ReadOnlyArray<PolicyType>,
};

export type KeyserverAuthResult = {
  +threadInfos: RawThreadInfos,
  +currentUserInfo?: ?LoggedInUserInfo,
  +messagesResult: GenericMessagesResult,
  +userInfos: $ReadOnlyArray<UserInfo>,
  +calendarResult: CalendarResult,
  +updatesCurrentAsOf: { +[keyserverID: string]: number },
  +logInActionSource: LogInActionSource,
  +notAcknowledgedPolicies?: ?$ReadOnlyArray<PolicyType>,
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
  +logInActionSource: LogInActionSource,
  +keyserverData: { +[keyserverID: string]: KeyserverRequestData },
};

export type KeyserverAuthRequest = $ReadOnly<{
  ...KeyserverRequestData,
  +userID: string,
  +deviceID: string,
  +doNotRegister: boolean,
  +calendarQuery: CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +watchedIDs: $ReadOnlyArray<string>,
  +platformDetails: PlatformDetails,
  +source?: LogInActionSource,
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

export type ClaimUsernameResponse = {
  +message: string,
  +signature: string,
};
