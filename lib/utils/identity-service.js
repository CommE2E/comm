// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import identityServiceConfig from '../facts/identity-service.js';
import { tShape } from '../utils/validation-utils.js';

export type InboundKeysForDeviceResponse = {
  identityKeyInfo: {
    keyPayload: string,
    keyPayloadSignature: string,
  },
  contentPrekey: {
    prekey: string,
    prekeySignature: string,
  },
  notifPrekey: {
    prekey: string,
    prekeySignature: string,
  },
};

export const inboundKeysForDeviceResponseValidator: TInterface<InboundKeysForDeviceResponse> =
  tShape<InboundKeysForDeviceResponse>({
    identityKeyInfo: tShape({
      keyPayload: t.String,
      keyPayloadSignature: t.String,
    }),
    contentPrekey: tShape({
      prekey: t.String,
      prekeySignature: t.String,
    }),
    notifPrekey: tShape({
      prekey: t.String,
      prekeySignature: t.String,
    }),
  });

function getInboundKeysForDeviceURL(deviceID: string): string {
  const base64URLEncodedDeviceID = deviceID
    .replaceAll('+', '-')
    .replaceAll('/', '_');
  const endpointBasePath =
    identityServiceConfig.httpEndpoints.GET_INBOUND_KEYS.path;
  const path = `${endpointBasePath}${base64URLEncodedDeviceID}`;
  return `${identityServiceConfig.defaultHttpURL}${path}`;
}

export { getInboundKeysForDeviceURL };
