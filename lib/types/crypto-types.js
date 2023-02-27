// @flow

export type OLMIdentityKeys = {
  +ed25519: string,
  +curve25519: string,
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
