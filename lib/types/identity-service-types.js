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
  +deleteUser: () => Promise<void>;
  +getKeyserverKeys: string => Promise<?OutboundKeyInfoResponse>;
  +registerUser?: (
    username: string,
    password: string,
  ) => Promise<IdentityRegisterResult>;
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
  +username?: ?string,
  +walletAddress?: ?string,
};

export type IdentityRegisterResult = {
  +userID: string,
  +accessToken: string,
  +username: string,
};

export const ONE_TIME_KEYS_NUMBER: number = Object.freeze(10);
