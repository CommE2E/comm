// @flow

import t, { type TInterface, type TList, type TDict } from 'tcomb';

import {
  identityKeysBlobValidator,
  type IdentityKeysBlob,
  signedPrekeysValidator,
  type SignedPrekeys,
  type OneTimeKeysResultValues,
} from './crypto-types.js';
import {
  type OlmSessionInitializationInfo,
  olmSessionInitializationInfoValidator,
} from './request-types.js';
import {
  currentUserInfoValidator,
  type CurrentUserInfo,
} from './user-types.js';
import { tUserID, tShape } from '../utils/validation-utils.js';

export type UserAuthMetadata = {
  +userID: string,
  +accessToken: string,
};

// This type should not be altered without also updating OutboundKeyInfoResponse
// in native/native_rust_library/src/identity/x3dh.rs
export type OutboundKeyInfoResponse = {
  +payload: string,
  +payloadSignature: string,
  +contentPrekey: string,
  +contentPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
  +oneTimeContentPrekey: ?string,
  +oneTimeNotifPrekey: ?string,
};

// This type should not be altered without also updating InboundKeyInfoResponse
// in native/native_rust_library/src/identity/x3dh.rs
export type InboundKeyInfoResponse = {
  +payload: string,
  +payloadSignature: string,
  +contentPrekey: string,
  +contentPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
  +username?: ?string,
  +walletAddress?: ?string,
};

export type DeviceOlmOutboundKeys = {
  +identityKeysBlob: IdentityKeysBlob,
  +contentInitializationInfo: OlmSessionInitializationInfo,
  +notifInitializationInfo: OlmSessionInitializationInfo,
  +payloadSignature: string,
};
export const deviceOlmOutboundKeysValidator: TInterface<DeviceOlmOutboundKeys> =
  tShape<DeviceOlmOutboundKeys>({
    identityKeysBlob: identityKeysBlobValidator,
    contentInitializationInfo: olmSessionInitializationInfoValidator,
    notifInitializationInfo: olmSessionInitializationInfoValidator,
    payloadSignature: t.String,
  });

export type UserDevicesOlmOutboundKeys = {
  +deviceID: string,
  +keys: ?DeviceOlmOutboundKeys,
};

export type DeviceOlmInboundKeys = {
  +identityKeysBlob: IdentityKeysBlob,
  +signedPrekeys: SignedPrekeys,
  +payloadSignature: string,
};
export const deviceOlmInboundKeysValidator: TInterface<DeviceOlmInboundKeys> =
  tShape<DeviceOlmInboundKeys>({
    identityKeysBlob: identityKeysBlobValidator,
    signedPrekeys: signedPrekeysValidator,
    payloadSignature: t.String,
  });

export type UserDevicesOlmInboundKeys = {
  +keys: {
    +[deviceID: string]: ?DeviceOlmInboundKeys,
  },
  +username?: ?string,
  +walletAddress?: ?string,
};

// This type should not be altered without also updating FarcasterUser in
// keyserver/addons/rust-node-addon/src/identity_client/get_farcaster_users.rs
export type FarcasterUser = {
  +userID: string,
  +username: string,
  +farcasterID: string,
};

export const farcasterUserValidator: TInterface<FarcasterUser> =
  tShape<FarcasterUser>({
    userID: tUserID,
    username: t.String,
    farcasterID: t.String,
  });

export const farcasterUsersValidator: TList<Array<FarcasterUser>> = t.list(
  farcasterUserValidator,
);

export const userDeviceOlmInboundKeysValidator: TInterface<UserDevicesOlmInboundKeys> =
  tShape<UserDevicesOlmInboundKeys>({
    keys: t.dict(t.String, t.maybe(deviceOlmInboundKeysValidator)),
    username: t.maybe(t.String),
    walletAddress: t.maybe(t.String),
  });

export interface IdentityServiceClient {
  // Only a primary device can initiate account deletion, and web cannot be a
  // primary device
  +deleteWalletUser?: () => Promise<void>;
  // Only a primary device can initiate account deletion, and web cannot be a
  // primary device
  +deletePasswordUser?: (password: string) => Promise<void>;
  +logOut: () => Promise<void>;
  +getKeyserverKeys: string => Promise<DeviceOlmOutboundKeys>;
  +registerPasswordUser?: (
    username: string,
    password: string,
  ) => Promise<IdentityAuthResult>;
  +logInPasswordUser: (
    username: string,
    password: string,
  ) => Promise<IdentityAuthResult>;
  +getOutboundKeysForUser: (
    userID: string,
  ) => Promise<UserDevicesOlmOutboundKeys[]>;
  +getInboundKeysForUser: (
    userID: string,
  ) => Promise<UserDevicesOlmInboundKeys>;
  +uploadOneTimeKeys: (oneTimeKeys: OneTimeKeysResultValues) => Promise<void>;
  +generateNonce: () => Promise<string>;
  +registerWalletUser?: (
    walletAddress: string,
    siweMessage: string,
    siweSignature: string,
  ) => Promise<IdentityAuthResult>;
  +logInWalletUser: (
    walletAddress: string,
    siweMessage: string,
    siweSignature: string,
  ) => Promise<IdentityAuthResult>;
  // on native, publishing prekeys to Identity is called directly from C++,
  // there is no need to expose it to JS
  +publishWebPrekeys?: (prekeys: SignedPrekeys) => Promise<void>;
  +getDeviceListHistoryForUser: (
    userID: string,
    sinceTimestamp?: number,
  ) => Promise<$ReadOnlyArray<SignedDeviceList>>;
  +getDeviceListsForUsers: (
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<UsersSignedDeviceLists>;
  // updating device list is possible only on Native
  // web cannot be a primary device, so there's no need to expose it to JS
  +updateDeviceList?: (newDeviceList: SignedDeviceList) => Promise<void>;
  +uploadKeysForRegisteredDeviceAndLogIn: (
    userID: string,
    signedNonce: SignedNonce,
  ) => Promise<IdentityAuthResult>;
  +getFarcasterUsers: (
    farcasterIDs: $ReadOnlyArray<string>,
  ) => Promise<$ReadOnlyArray<FarcasterUser>>;
  +linkFarcasterAccount: (farcasterID: string) => Promise<void>;
  +unlinkFarcasterAccount: () => Promise<void>;
}

export type IdentityServiceAuthLayer = {
  +userID: string,
  +deviceID: string,
  +commServicesAccessToken: string,
};

export type IdentityAuthResult = {
  +userID: string,
  +accessToken: string,
  +username: string,
  +preRequestUserState?: ?CurrentUserInfo,
};
export const identityAuthResultValidator: TInterface<IdentityAuthResult> =
  tShape<IdentityAuthResult>({
    userID: tUserID,
    accessToken: t.String,
    username: t.String,
    preRequestUserState: t.maybe(currentUserInfoValidator),
  });

export type IdentityNewDeviceKeyUpload = {
  +keyPayload: string,
  +keyPayloadSignature: string,
  +contentPrekey: string,
  +contentPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
  +contentOneTimeKeys: $ReadOnlyArray<string>,
  +notifOneTimeKeys: $ReadOnlyArray<string>,
};

export type IdentityExistingDeviceKeyUpload = {
  +keyPayload: string,
  +keyPayloadSignature: string,
  +contentPrekey: string,
  +contentPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
};

// Device list types

export type RawDeviceList = {
  +devices: $ReadOnlyArray<string>,
  +timestamp: number,
};
export const rawDeviceListValidator: TInterface<RawDeviceList> =
  tShape<RawDeviceList>({
    devices: t.list(t.String),
    timestamp: t.Number,
  });

export type UsersRawDeviceLists = {
  +[userID: string]: RawDeviceList,
};

export type SignedDeviceList = {
  // JSON-stringified RawDeviceList
  +rawDeviceList: string,
  // Current primary device signature. Absent for Identity Service generated
  // device lists.
  +curPrimarySignature?: string,
  // Previous primary device signature. Present only if primary device
  // has changed since last update.
  +lastPrimarySignature?: string,
};
export const signedDeviceListValidator: TInterface<SignedDeviceList> =
  tShape<SignedDeviceList>({
    rawDeviceList: t.String,
    curPrimarySignature: t.maybe(t.String),
    lastPrimarySignature: t.maybe(t.String),
  });
export const signedDeviceListHistoryValidator: TList<Array<SignedDeviceList>> =
  t.list(signedDeviceListValidator);

export type UsersSignedDeviceLists = {
  +[userID: string]: SignedDeviceList,
};
export const usersSignedDeviceListsValidator: TDict<UsersSignedDeviceLists> =
  t.dict(t.String, signedDeviceListValidator);

export type SignedNonce = {
  +nonce: string,
  +nonceSignature: string,
};

export const ONE_TIME_KEYS_NUMBER = 10;

export const identityDeviceTypes = Object.freeze({
  KEYSERVER: 0,
  WEB: 1,
  IOS: 2,
  ANDROID: 3,
  WINDOWS: 4,
  MAC_OS: 5,
});
