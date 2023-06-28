// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

export type OLMIdentityKeys = {
  +ed25519: string,
  +curve25519: string,
};

export type OLMPrekey = {
  +curve25519: {
    +id: string,
    +key: string,
  },
};

export type OLMOneTimeKeys = {
  +curve25519: { +[string]: string },
};

export type PickledOLMAccount = {
  +picklingKey: string,
  +pickledAccount: string,
};

export type CryptoStore = {
  +primaryAccount: ?PickledOLMAccount,
  +primaryIdentityKeys: ?OLMIdentityKeys,
  +notificationAccount: ?PickledOLMAccount,
  +notificationIdentityKeys: ?OLMIdentityKeys,
};

export type IdentityKeysBlob = {
  +primaryIdentityPublicKeys: OLMIdentityKeys,
  +notificationIdentityPublicKeys: OLMIdentityKeys,
};

export type SignedIdentityKeysBlob = {
  +payload: string,
  +signature: string,
};
export const signedIdentityKeysBlobValidator: TInterface<SignedIdentityKeysBlob> =
  tShape<SignedIdentityKeysBlob>({
    payload: t.String,
    signature: t.String,
  });

// This type should not be changed without making equivalent changes to
// `Message` in Identity service's `reserved_users` module
export type ReservedUsernameMessage =
  | {
      +statement: 'Add the following usernames to reserved list',
      +payload: $ReadOnlyArray<string>,
      +issuedAt: string,
    }
  | {
      +statement: 'Remove the following username from reserved list',
      +payload: string,
      +issuedAt: string,
    }
  | {
      +statement: 'This user is the owner of the following username',
      +payload: string,
      +issuedAt: string,
    };

export const olmEncryptedMessageTypes = Object.freeze({
  PREKEY: 0,
  TEXT: 1,
});
