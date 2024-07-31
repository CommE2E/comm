// @flow

import localforage from 'localforage';

import identityServiceConfig from 'lib/facts/identity-service.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import {
  identityKeysBlobValidator,
  type OLMIdentityKeys,
} from 'lib/types/crypto-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import {
  getInboundKeysForDeviceURL,
  inboundKeysForDeviceResponseValidator,
} from 'lib/utils/identity-service.js';
import { createHTTPAuthorizationHeader } from 'lib/utils/services-utils.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import {
  persistEncryptionKey,
  retrieveEncryptionKey,
} from './notif-crypto-utils.js';
import {
  type EncryptedData,
  decryptData,
  encryptData,
  generateCryptoKey,
} from '../crypto/aes-gcm-crypto-utils.js';
import { isDesktopSafari } from '../shared-worker/utils/db-utils.js';

export const WEB_NOTIFS_SERVICE_CSAT_ENCRYPTION_KEY = 'notifsCSATEncryptionKey';
export const WEB_NOTIFS_SERVICE_CSAT = 'notifsCSAT';

async function persistAuthMetadata(authMetadata: AuthMetadata): Promise<void> {
  const encryptionKey = await generateCryptoKey({
    extractable: isDesktopSafari,
  });

  const encryptedAuthMetadata = await encryptData(
    new TextEncoder().encode(JSON.stringify(authMetadata)),
    encryptionKey,
  );

  await Promise.all([
    localforage.setItem(WEB_NOTIFS_SERVICE_CSAT, encryptedAuthMetadata),
    persistEncryptionKey(WEB_NOTIFS_SERVICE_CSAT_ENCRYPTION_KEY, encryptionKey),
  ]);
}

async function fetchAuthMetadata(): Promise<AuthMetadata> {
  const [encryptionKey, encryptedAuthMetadata] = await Promise.all([
    retrieveEncryptionKey(WEB_NOTIFS_SERVICE_CSAT_ENCRYPTION_KEY),
    localforage.getItem<EncryptedData>(WEB_NOTIFS_SERVICE_CSAT),
  ]);

  if (!encryptionKey || !encryptedAuthMetadata) {
    throw new Error('CSAT unavailable in push notifs service worker');
  }

  const authMetadata: AuthMetadata = JSON.parse(
    new TextDecoder().decode(
      await decryptData(encryptedAuthMetadata, encryptionKey),
    ),
  );

  return authMetadata;
}

async function getNotifsInboundKeysForDeviceID(
  deviceID: string,
  authMetadata: AuthMetadata,
): Promise<OLMIdentityKeys | { error: string }> {
  const authorization = createHTTPAuthorizationHeader(authMetadata);
  const headers = {
    Authorization: authorization,
    Accept: 'application/json',
  };
  try {
    const getInboundKeysResponse = await fetch(
      getInboundKeysForDeviceURL(deviceID),
      {
        method: identityServiceConfig.httpEndpoints.GET_INBOUND_KEYS.method,
        headers,
      },
    );

    if (!getInboundKeysResponse.ok) {
      const { statusText, status } = getInboundKeysResponse;
      return {
        error:
          `Failed to fetch inbound keys for ${deviceID} with code: ${status}. ` +
          `Details: ${statusText}`,
      };
    }

    const inboundKeysForDeviceBlob = await getInboundKeysResponse.json();
    const inboundKeysForDevice = assertWithValidator(
      inboundKeysForDeviceBlob,
      inboundKeysForDeviceResponseValidator,
    );
    const identityKeysBlob = inboundKeysForDevice.identityKeyInfo.keyPayload;
    const identityKeys = assertWithValidator(
      JSON.parse(identityKeysBlob),
      identityKeysBlobValidator,
    );
    return identityKeys.notificationIdentityPublicKeys;
  } catch (e) {
    return {
      error: `Failed to fetch inbound keys for ${deviceID}. Details: ${
        getMessageForException(e) ?? ''
      }`,
    };
  }
}

export {
  persistAuthMetadata,
  fetchAuthMetadata,
  getNotifsInboundKeysForDeviceID,
};
