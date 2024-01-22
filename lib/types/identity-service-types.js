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

export type DeviceOlmOutboundKeys = {
  +identityKeysBlob: IdentityKeysBlob,
  +contentInitializationInfo: OlmSessionInitializationInfo,
  +notifInitializationInfo: OlmSessionInitializationInfo,
  +payloadSignature: string,
  +socialProof: ?string,
};
export const deviceOlmOutboundKeysValidator: TInterface<DeviceOlmOutboundKeys> =
  tShape<DeviceOlmOutboundKeys>({
    identityKeysBlob: identityKeysBlobValidator,
    contentInitializationInfo: olmSessionInitializationInfoValidator,
    notifInitializationInfo: olmSessionInitializationInfoValidator,
    payloadSignature: t.String,
    socialProof: t.maybe(t.String),
  });

export type UserDevicesOlmOutboundKeys = {
  +deviceID: string,
  +keys: ?DeviceOlmOutboundKeys,
};

export interface IdentityServiceClient {
  +deleteUser: () => Promise<void>;
  +getKeyserverKeys: string => Promise<DeviceOlmOutboundKeys>;
  +registerUser?: (
    username: string,
    password: string,
  ) => Promise<IdentityRegisterResult>;
  +getOutboundKeysForUser?: (
    userID: string,
  ) => Promise<UserDevicesOlmOutboundKeys[]>;
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

export const ONE_TIME_KEYS_NUMBER = 10;
