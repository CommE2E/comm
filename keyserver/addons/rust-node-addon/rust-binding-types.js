// @flow

import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';

type tunnelbrokerOnReceiveCallback = (
  err: Error | null,
  payload: string,
) => mixed;

declare class TunnelbrokerClientClass {
  constructor(
    deviceId: string,
    onReceiveCallback: tunnelbrokerOnReceiveCallback,
  ): TunnelbrokerClientClass;
  publish(toDeviceId: string, payload: string): Promise<void>;
}

type UserComparisonResult = {
  +usersMissingFromKeyserver: $ReadOnlyArray<string>,
  +usersMissingFromIdentity: $ReadOnlyArray<string>,
};

type DeviceKeys = {
  +keyPayload: string,
  +keyPayloadSignature: string,
  +identityPrekey: string,
  +identityPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
  +identityOnetimeKeys: $ReadOnlyArray<string>,
  +notifOnetimeKeys: $ReadOnlyArray<string>,
};

type RustNativeBindingAPI = {
  +registerUser: (
    username: string,
    password: string,
    deviceKeys: DeviceKeys,
  ) => Promise<string>,
  +loginUserPake: (
    userId: string,
    signingPublicKey: string,
    password: string,
    sessionInitializationInfo: SignedIdentityKeysBlob,
  ) => Promise<string>,
  +loginUserWallet: (
    userId: string,
    signingPublicKey: string,
    siweMessage: string,
    siweSignature: string,
    sessionInitializationInfo: SignedIdentityKeysBlob,
    socialProof: string,
  ) => Promise<string>,
  +deleteUser: (userId: string) => Promise<boolean>,
  +updateUser: (userId: string, password: string) => Promise<string>,
  +compareUsers: (
    userIds: $ReadOnlyArray<string>,
  ) => Promise<UserComparisonResult>,
  +TunnelbrokerClient: Class<TunnelbrokerClientClass>,
};

export type { RustNativeBindingAPI, DeviceKeys };
