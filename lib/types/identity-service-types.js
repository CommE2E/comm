// @flow

import invariant from 'invariant';
import t, { type TInterface, type TList, type TDict, type TEnums } from 'tcomb';

import {
  identityKeysBlobValidator,
  type IdentityKeysBlob,
  signedPrekeysValidator,
  type SignedPrekeys,
  type OneTimeKeysResultValues,
} from './crypto-types.js';
import { type Platform } from './device-types.js';
import {
  type OlmSessionInitializationInfo,
  olmSessionInitializationInfoValidator,
} from './olm-session-types.js';
import { type SignedMessage } from './siwe-types.js';
import {
  currentUserInfoValidator,
  type CurrentUserInfo,
} from './user-types.js';
import { values } from '../utils/objects.js';
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
  // This log out type is specific to primary device, and web cannot be a
  // primary device
  +logOutPrimaryDevice?: () => Promise<void>;
  +logOutSecondaryDevice: () => Promise<void>;
  +getKeyserverKeys: string => Promise<DeviceOlmOutboundKeys>;
  // Users cannot register from web
  +registerPasswordUser?: (
    username: string,
    password: string,
    fid: ?string,
  ) => Promise<IdentityAuthResult>;
  // Users cannot register from web
  +registerReservedPasswordUser?: (
    username: string,
    password: string,
    keyserverMessage: string,
    keyserverSignature: string,
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
  // Users cannot register from web
  +registerWalletUser?: (
    walletAddress: string,
    siweMessage: string,
    siweSignature: string,
    fid: ?string,
  ) => Promise<IdentityAuthResult>;
  +logInWalletUser: (
    walletAddress: string,
    siweMessage: string,
    siweSignature: string,
  ) => Promise<IdentityAuthResult>;
  // Users cannot restore backup from web
  +restoreUser?: (
    userID: string,
    deviceList: SignedDeviceList,
    siweSocialProof?: SignedMessage,
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
  ) => Promise<PeersDeviceLists>;
  // updating device list is possible only on Native
  // web cannot be a primary device, so there's no need to expose it to JS
  +updateDeviceList?: (newDeviceList: SignedDeviceList) => Promise<void>;
  +syncPlatformDetails: () => Promise<void>;
  +uploadKeysForRegisteredDeviceAndLogIn: (
    userID: string,
    signedNonce: SignedNonce,
  ) => Promise<IdentityAuthResult>;
  +getFarcasterUsers: (
    farcasterIDs: $ReadOnlyArray<string>,
  ) => Promise<$ReadOnlyArray<FarcasterUser>>;
  +linkFarcasterAccount: (farcasterID: string) => Promise<void>;
  +unlinkFarcasterAccount: () => Promise<void>;
  +findUserIdentities: (
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<UserIdentitiesResponse>;
  +versionSupported: () => Promise<boolean>;
  +changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
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

// User Identity types

export type EthereumIdentity = {
  walletAddress: string,
  siweMessage: string,
  siweSignature: string,
};
export type Identity = {
  +username: string,
  +ethIdentity: ?EthereumIdentity,
  +farcasterID: ?string,
};
export type Identities = {
  +[userID: string]: Identity,
};
export const ethereumIdentityValidator: TInterface<EthereumIdentity> =
  tShape<EthereumIdentity>({
    walletAddress: t.String,
    siweMessage: t.String,
    siweSignature: t.String,
  });
export const identityValidator: TInterface<Identity> = tShape<Identity>({
  username: t.String,
  ethIdentity: t.maybe(ethereumIdentityValidator),
  farcasterID: t.maybe(t.String),
});
export const identitiesValidator: TDict<Identities> = t.dict(
  t.String,
  identityValidator,
);

export type ReservedUserIdentifiers = {
  +[userID: string]: string,
};
export const reservedIdentifiersValidator: TDict<ReservedUserIdentifiers> =
  t.dict(t.String, t.String);

export type UserIdentitiesResponse = {
  +identities: Identities,
  +reservedUserIdentifiers: ReservedUserIdentifiers,
};
export const userIdentitiesResponseValidator: TInterface<UserIdentitiesResponse> =
  tShape<UserIdentitiesResponse>({
    identities: identitiesValidator,
    reservedUserIdentifiers: reservedIdentifiersValidator,
  });

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

export type IdentityDeviceType = $Values<typeof identityDeviceTypes>;

function isIdentityDeviceType(deviceType: number): boolean %checks {
  return (
    deviceType === 0 ||
    deviceType === 1 ||
    deviceType === 2 ||
    deviceType === 3 ||
    deviceType === 4 ||
    deviceType === 5
  );
}

export function assertIdentityDeviceType(
  deviceType: number,
): IdentityDeviceType {
  invariant(
    isIdentityDeviceType(deviceType),
    'number is not IdentityDeviceType enum',
  );
  return deviceType;
}

export const identityDeviceTypeToPlatform: {
  +[identityDeviceType: IdentityDeviceType]: Platform,
} = Object.freeze({
  [identityDeviceTypes.WEB]: 'web',
  [identityDeviceTypes.ANDROID]: 'android',
  [identityDeviceTypes.IOS]: 'ios',
  [identityDeviceTypes.WINDOWS]: 'windows',
  [identityDeviceTypes.MAC_OS]: 'macos',
});

export const platformToIdentityDeviceType: {
  +[platform: Platform]: IdentityDeviceType,
} = Object.freeze({
  web: identityDeviceTypes.WEB,
  android: identityDeviceTypes.ANDROID,
  ios: identityDeviceTypes.IOS,
  windows: identityDeviceTypes.WINDOWS,
  macos: identityDeviceTypes.MAC_OS,
});

export const identityDeviceTypeValidator: TEnums = t.enums.of(
  values(identityDeviceTypes),
);

export type IdentityPlatformDetails = {
  +deviceType: IdentityDeviceType,
  +codeVersion: number,
  +stateVersion?: number,
  +majorDesktopVersion?: number,
};
export const identityPlatformDetailsValidator: TInterface<IdentityPlatformDetails> =
  tShape<IdentityPlatformDetails>({
    deviceType: identityDeviceTypeValidator,
    codeVersion: t.Number,
    stateVersion: t.maybe(t.Number),
    majorDesktopVersion: t.maybe(t.Number),
  });

export type UserDevicesPlatformDetails = {
  +[deviceID: string]: IdentityPlatformDetails,
};
export const userDevicesPlatformDetailsValidator: TDict<UserDevicesPlatformDetails> =
  t.dict(t.String, identityPlatformDetailsValidator);

export type UsersDevicesPlatformDetails = {
  +[userID: string]: UserDevicesPlatformDetails,
};
export const usersDevicesPlatformDetailsValidator: TDict<UsersDevicesPlatformDetails> =
  t.dict(t.String, userDevicesPlatformDetailsValidator);

export type PeersDeviceLists = {
  +usersSignedDeviceLists: UsersSignedDeviceLists,
  +usersDevicesPlatformDetails: UsersDevicesPlatformDetails,
};
export const peersDeviceListsValidator: TInterface<PeersDeviceLists> = tShape({
  usersSignedDeviceLists: usersSignedDeviceListsValidator,
  usersDevicesPlatformDetails: usersDevicesPlatformDetailsValidator,
});
