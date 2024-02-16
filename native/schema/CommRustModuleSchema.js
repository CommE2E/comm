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
    password: string,
  ) => Promise<void>;
  +deleteUser: (
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
  +updateDeviceList: (
    authUserID: string,
    authDeviceID: string,
    authAccessToken: string,
    updatePayload: string,
  ) => Promise<void>;
  +findUserIDForWalletAddress: (walletAddress: string) => Promise<string>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommRustTurboModule',
): Spec);
