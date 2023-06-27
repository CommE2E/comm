// @flow

import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';

type RustNativeBindingAPI = {
  +registerUser: (
    username: string,
    password: string,
    signedIdentityKeysBlob: SignedIdentityKeysBlob,
  ) => Promise<boolean>,
  +addReservedUsernames: (message: string, signature: string) => Promise<void>,
  +removeReservedUsername: (
    message: string,
    signature: string,
  ) => Promise<void>,
};

export type { RustNativeBindingAPI };
