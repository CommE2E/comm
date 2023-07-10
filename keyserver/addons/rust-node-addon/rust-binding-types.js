// @flow

import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';

type UserLoginResponse = {
  +userId: string,
  +accessToken: string,
};

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
  ) => Promise<UserLoginResponse>,
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
  ) => Promise<UserLoginResponse>,
  +addReservedUsernames: (message: string, signature: string) => Promise<void>,
  +removeReservedUsername: (
    message: string,
    signature: string,
  ) => Promise<void>,
  +publish_prekeys: (
    user_id: string,
    device_id: string,
    access_token: string,
    content_prekey: string,
    content_prekey_signature: string,
    notif_prekey: string,
    notif_prekey_signature: string,
  ) => Promise<boolean>,
};

export type { RustNativeBindingAPI };
