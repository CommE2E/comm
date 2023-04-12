// @flow

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

export type OLMSessionInitializationKeys = {
  +prekey: OLMPrekey,
  +oneTimeKeysBatch: OLMOneTimeKeys,
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
