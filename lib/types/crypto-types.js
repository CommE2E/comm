// @flow

export type OLMIdentityKeys = {
  +ed25519: string,
  +curve25519: string,
};

export type CryptoStore = {
  +primaryIdentityKeys: ?OLMIdentityKeys,
  +notificationIdentityKeys: ?OLMIdentityKeys,
};
