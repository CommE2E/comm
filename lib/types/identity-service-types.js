// @flow

export type UserLoginResponse = {
  +userId: string,
  +accessToken: string,
};

// This type should not be altered without also updating
// OutboundKeyInfoResponse in native/native_rust_library/src/lib.rs
export type OutboundKeyInfoResponse = {
  +payload: string,
  +payloadSignature: string,
  +socialProof: ?string,
  +contentPrekey: string,
  +contentPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
  +oneTimeContentPrekey: ?string,
  +oneTimeNotifPrekey: ?string,
};

export type IdentityServiceAuthLayer = {
  +userID: string,
  +deviceID: string,
  +commServicesAccessToken: string,
};

export type IdentityKeyInfo = {
  +payload: string,
  +payloadSignature: string,
  +socialProof: ?string,
};

export type PreKey = {
  +preKey: string,
  +preKeySignature: string,
};

export type OutboundKeyInfo = {
  +identityInfo: ?IdentityKeyInfo,
  +contentPreKey: ?PreKey,
  +notifPreKey: ?PreKey,
  +oneTimeContentPreKey: string,
  +oneTimeNotifPreKey: string,
};
