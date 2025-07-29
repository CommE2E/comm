// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import identityServiceConfig from '../facts/identity-service.js';
import type {
  PartialAuthMetadata,
  IdentityClientContextType,
} from '../shared/identity-client-context.js';
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
  const urlSafeDeviceID = deviceID.replaceAll('+', '-').replaceAll('/', '_');
  const endpointBasePath =
    identityServiceConfig.httpEndpoints.GET_INBOUND_KEYS.path;
  const path = `${endpointBasePath}${urlSafeDeviceID}`;
  return `${identityServiceConfig.defaultHttpURL}${path}`;
}

async function withAuthMetadataOverride<T>(
  identityClient: IdentityClientContextType,
  metadataOverride: ?PartialAuthMetadata,
  closure: () => Promise<T>,
): Promise<T> {
  if (!metadataOverride) {
    return closure();
  }

  try {
    identityClient.setAuthMetadataOverride(metadataOverride);
    return await closure();
  } finally {
    identityClient.clearAuthMetadataOverride();
  }
}

const identityServiceQueryTimeout = 20 * 1000; // twenty seconds

export {
  getInboundKeysForDeviceURL,
  identityServiceQueryTimeout,
  withAuthMetadataOverride,
};
