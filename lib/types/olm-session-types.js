// @flow

import t, { type TInterface } from 'tcomb';

import {
  signedIdentityKeysBlobValidator,
  type SignedIdentityKeysBlob,
} from './crypto-types.js';
import { tShape } from '../utils/validation-utils.js';

export type OlmSessionInitializationInfo = {
  +prekey: string,
  +prekeySignature: string,
  +oneTimeKey: ?string,
};
export const olmSessionInitializationInfoValidator: TInterface<OlmSessionInitializationInfo> =
  tShape<OlmSessionInitializationInfo>({
    prekey: t.String,
    prekeySignature: t.String,
    oneTimeKey: t.maybe(t.String),
  });

export type GetOlmSessionInitializationDataResponse = {
  +signedIdentityKeysBlob: SignedIdentityKeysBlob,
  +contentInitializationInfo: OlmSessionInitializationInfo,
  +notifInitializationInfo: OlmSessionInitializationInfo,
};
export const getOlmSessionInitializationDataResponseValidator: TInterface<GetOlmSessionInitializationDataResponse> =
  tShape({
    signedIdentityKeysBlob: signedIdentityKeysBlobValidator,
    contentInitializationInfo: olmSessionInitializationInfoValidator,
    notifInitializationInfo: olmSessionInitializationInfoValidator,
  });
