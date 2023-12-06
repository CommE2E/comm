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

export interface IdentityServiceClient {
  +deleteUser: (
    userID: string,
    deviceID: string,
    accessToken: string,
  ) => Promise<void>;
}

export type IdentityServiceAuthLayer = {
  +userID: string,
  +deviceID: string,
  +commServicesAccessToken: string,
};

// This type should not be altered without also updating
// InboundKeyInfoResponse in native/native_rust_library/src/lib.rs
export type InboundKeyInfoResponse = {
  +payload: string,
  +payloadSignature: string,
  +socialProof?: ?string,
  +contentPrekey: string,
  +contentPrekeySignature: string,
  +notifPrekey: string,
  +notifPrekeySignature: string,
};
