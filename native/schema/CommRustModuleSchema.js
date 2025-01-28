// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

export interface Spec extends TurboModule {
  +generateNonce: () => Promise<string>;
  +registerPasswordUser: (
    username: string,
    password: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
    farcasterID: string,
    initialDeviceList: string,
  ) => Promise<string>;
  +registerReservedPasswordUser: (
    username: string,
    password: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
    keyserverMessage: string,
    keyserverSignature: string,
    initialDeviceList: string,
  ) => Promise<string>;
  +logInPasswordUser: (
    username: string,
    password: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
  ) => Promise<string>;
  +registerWalletUser: (
    siweMessage: string,
    siweSignature: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
    farcasterID: string,
    initialDeviceList: string,
  ) => Promise<string>;
  +logInWalletUser: (
    siweMessage: string,
    siweSignature: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
  ) => Promise<string>;
  +updatePassword: (
    userID: string,
    deviceID: string,
    accessToken: string,
    oldPassword: string,
    newPassword: string,
  ) => Promise<void>;
  +deletePasswordUser: (
    userID: string,
    deviceID: string,
    accessToken: string,
    password: string,
  ) => Promise<void>;
  +deleteWalletUser: (
    userID: string,
    deviceID: string,
    accessToken: string,
  ) => Promise<void>;
  +logOut: (
    userID: string,
    deviceID: string,
    accessToken: string,
  ) => Promise<void>;
  +logOutPrimaryDevice: (
    userID: string,
    deviceID: string,
    accessToken: string,
    signedDeviceList: string,
  ) => Promise<void>;
  +logOutSecondaryDevice: (
    userID: string,
    deviceID: string,
    accessToken: string,
  ) => Promise<void>;
  +getOutboundKeysForUser: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
    userID: string,
  ) => Promise<string>;
  +getInboundKeysForUser: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
    userID: string,
  ) => Promise<string>;
  +versionSupported: () => Promise<boolean>;
  +uploadOneTimeKeys: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
    contentOneTimePreKeys: $ReadOnlyArray<string>,
    notifOneTimePreKeys: $ReadOnlyArray<string>,
  ) => Promise<void>;
  +getKeyserverKeys: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
    keyserverID: string,
  ) => Promise<string>;
  +getDeviceListForUser: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
    userID: string,
    sinceTimestamp: ?number,
  ) => Promise<string>;
  +getDeviceListsForUsers: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<string>;
  +updateDeviceList: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
    updatePayload: string,
  ) => Promise<void>;
  +syncPlatformDetails: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
  ) => Promise<void>;
  +uploadSecondaryDeviceKeysAndLogIn: (
    userID: string,
    nonce: string,
    nonceSignature: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: $ReadOnlyArray<string>,
    notifOneTimeKeys: $ReadOnlyArray<string>,
  ) => Promise<string>;
  +logInExistingDevice: (
    userID: string,
    deviceID: string,
    nonce: string,
    nonceSignature: string,
  ) => Promise<string>;
  +findUserIDForWalletAddress: (walletAddress: string) => Promise<string>;
  +findUserIDForUsername: (username: string) => Promise<string>;
  +getFarcasterUsers: (farcasterIDs: $ReadOnlyArray<string>) => Promise<string>;
  +linkFarcasterAccount: (
    userID: string,
    deviceID: string,
    accessToken: string,
    farcasterID: string,
  ) => Promise<void>;
  +unlinkFarcasterAccount: (
    userID: string,
    deviceID: string,
    accessToken: string,
  ) => Promise<void>;
  +findUserIdentities: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<string>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommRustTurboModule',
): Spec);
