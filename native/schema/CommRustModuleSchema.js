// @flow

'use strict';

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport.js';

export interface Spec extends TurboModule {
  +generateNonce: () => Promise<string>;
  +registerUser: (
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
  +loginPasswordUser: (
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
  +loginWalletUser: (
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
    socialProof: string,
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
  +versionSupported: () => Promise<boolean>;
}

export default (TurboModuleRegistry.getEnforcing<Spec>(
  'CommRustTurboModule',
): Spec);
