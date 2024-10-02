// @flow

import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';
import type {
  InboundKeyInfoResponse,
  FarcasterUser,
  UserIdentitiesResponse,
} from 'lib/types/identity-service-types.js';

import type { IdentityInfo } from '../../src/user/identity.js';

type RustNativeBindingAPI = {
  +loginUser: (
    username: string,
    password: string,
    signedIdentityKeysBlob: SignedIdentityKeysBlob,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
    force: ?boolean,
  ) => Promise<IdentityInfo>,
  +registerUser: (
    username: string,
    password: string,
    signedIdentityKeysBlob: SignedIdentityKeysBlob,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
  ) => Promise<IdentityInfo>,
  +addReservedUsernames: (message: string, signature: string) => Promise<void>,
  +removeReservedUsername: (
    message: string,
    signature: string,
  ) => Promise<void>,
  +publishPrekeys: (
    userId: string,
    deviceId: string,
    accessToken: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
  ) => Promise<boolean>,
  +uploadOneTimeKeys: (
    userId: string,
    deviceId: string,
    accessToken: string,
    contentOneTimePrekeys: $ReadOnlyArray<string>,
    notifOneTimePrekeys: $ReadOnlyArray<string>,
  ) => Promise<boolean>,
  +getInboundKeysForUserDevice: (
    authUserId: string,
    authDeviceId: string,
    authAccessToken: string,
    userId: string,
    deviceId: string,
  ) => Promise<InboundKeyInfoResponse>,
  +getFarcasterUsers: (
    farcasterIds: $ReadOnlyArray<string>,
  ) => Promise<$ReadOnlyArray<FarcasterUser>>,
  +generateNonce: () => Promise<string>,
  +uploadSecondaryDeviceKeysAndLogIn: (
    userId: string,
    nonce: string,
    nonceSignature: string,
    signedIdentityKeysBlob: SignedIdentityKeysBlob,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
  ) => Promise<IdentityInfo>,
  +findUserIdentities: (
    authUserId: string,
    authDeviceId: string,
    authAccessToken: string,
    userIds: $ReadOnlyArray<string>,
  ) => Promise<UserIdentitiesResponse>,
};

export type { RustNativeBindingAPI };
