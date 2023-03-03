// @flow

import type { SignedIdentityKeysBlob } from './crypto-types.js';

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

type RustNativeBindingAPI = {
  +registerUser: (
    userId: string,
    signingPublicKey: string,
    username: string,
    password: string,
    sessionInitializationInfo: SignedIdentityKeysBlob,
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
  +TunnelbrokerClient: Class<TunnelbrokerClientClass>,
};

export type { RustNativeBindingAPI };
