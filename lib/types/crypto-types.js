// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

export type OLMIdentityKeys = {
  +ed25519: string,
  +curve25519: string,
};
const olmIdentityKeysValidator: TInterface<OLMIdentityKeys> =
  tShape<OLMIdentityKeys>({
    ed25519: t.String,
    curve25519: t.String,
  });

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
  +primaryAccount: PickledOLMAccount,
  +primaryIdentityKeys: OLMIdentityKeys,
  +notificationAccount: PickledOLMAccount,
  +notificationIdentityKeys: OLMIdentityKeys,
};

export type CryptoStoreContextType = {
  +getInitializedCryptoStore: () => Promise<CryptoStore>,
};

export type NotificationsOlmDataType = {
  +mainSession: string,
  +picklingKey: string,
  +pendingSessionUpdate: string,
  +updateCreationTimestamp: number,
};

export type IdentityKeysBlob = {
  +primaryIdentityPublicKeys: OLMIdentityKeys,
  +notificationIdentityPublicKeys: OLMIdentityKeys,
};
export const identityKeysBlobValidator: TInterface<IdentityKeysBlob> =
  tShape<IdentityKeysBlob>({
    primaryIdentityPublicKeys: olmIdentityKeysValidator,
    notificationIdentityPublicKeys: olmIdentityKeysValidator,
  });

export type SignedIdentityKeysBlob = {
  +payload: string,
  +signature: string,
};
export const signedIdentityKeysBlobValidator: TInterface<SignedIdentityKeysBlob> =
  tShape<SignedIdentityKeysBlob>({
    payload: t.String,
    signature: t.String,
  });

export type UserDetail = {
  +username: string,
  +userID: string,
};

// This type should not be changed without making equivalent changes to
// `Message` in Identity service's `reserved_users` module
export type ReservedUsernameMessage =
  | {
      +statement: 'Add the following usernames to reserved list',
      +payload: $ReadOnlyArray<UserDetail>,
      +issuedAt: string,
    }
  | {
      +statement: 'Remove the following username from reserved list',
      +payload: string,
      +issuedAt: string,
    }
  | {
      +statement: 'This user is the owner of the following username and user ID',
      +payload: UserDetail,
      +issuedAt: string,
    };

export const olmEncryptedMessageTypes = Object.freeze({
  PREKEY: 0,
  TEXT: 1,
});
