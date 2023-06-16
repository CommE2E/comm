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

type RustNativeBindingAPI = {
  +registerUser: (
    username: string,
    password: string,
    signedIdentityKeysBlob: SignedIdentityKeysBlob,
  ) => Promise<boolean>,
  +addReservedUsername: (message: string, signature: string) => Promise<void>,
  +removeReservedUsername: (
    message: string,
    signature: string,
  ) => Promise<void>,
  +TunnelbrokerClient: Class<TunnelbrokerClientClass>,
};

export type { RustNativeBindingAPI };
