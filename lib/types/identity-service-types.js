// @flow

import t, { type TInterface } from 'tcomb';

import {
  identityKeysBlobValidator,
  type IdentityKeysBlob,
} from './crypto-types.js';
import {
  type OlmSessionInitializationInfo,
  olmSessionInitializationInfoValidator,
} from './request-types.js';
import { tShape } from '../utils/validation-utils.js';

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

export type KeyserverKeys = {
  +identityKeysBlob: IdentityKeysBlob,
  +contentInitializationInfo: OlmSessionInitializationInfo,
  +notifInitializationInfo: OlmSessionInitializationInfo,
  +payloadSignature: string,
  +socialProof: ?string,
};
export const keyserverKeysValidator: TInterface<KeyserverKeys> =
  tShape<KeyserverKeys>({
    identityKeysBlob: identityKeysBlobValidator,
    contentInitializationInfo: olmSessionInitializationInfoValidator,
    notifInitializationInfo: olmSessionInitializationInfoValidator,
    payloadSignature: t.String,
    socialProof: t.maybe(t.String),
  });

export interface IdentityServiceClient {
  +deleteUser: () => Promise<void>;
  +getKeyserverKeys: string => Promise<KeyserverKeys>;
  +registerUser?: (
    username: string,
    password: string,
  ) => Promise<IdentityAuthResult>;
  +logInPasswordUser: (
    username: string,
    password: string,
    keyPayload: string,
    keyPayloadSignature: string,
    contentPrekey: string,
    contentPrekeySignature: string,
    notifPrekey: string,
    notifPrekeySignature: string,
    contentOneTimeKeys: Array<string>,
    notifOneTimeKeys: Array<string>,
  ) => Promise<IdentityAuthResult>;
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

export type IdentityAuthResult = {
  +userID: string,
  +accessToken: string,
  +username: string,
};

export const ONE_TIME_KEYS_NUMBER = 10;

export const DeviceType = Object.freeze({
  KEYSERVER: 0,
  WEB: 1,
  IOS: 2,
  ANDROID: 3,
  WINDOWS: 4,
  MAC_OS: 5,
});
