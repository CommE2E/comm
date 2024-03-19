// @flow

import t from 'tcomb';
import { type TInterface } from 'tcomb';

import { getConfig } from './config.js';
import { primaryIdentityPublicKeyRegex } from './siwe-utils.js';
import { tRegex, tShape } from './validation-utils.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';
import type { ClientMessageToDevice } from '../tunnelbroker/tunnelbroker-context.js';
import type {
  IdentityKeysBlob,
  OLMIdentityKeys,
  SignedIdentityKeysBlob,
} from '../types/crypto-types';
import type { IdentityServiceClient } from '../types/identity-service-types';
import {
  type OutboundSessionCreation,
  peerToPeerMessageTypes,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';

const signedIdentityKeysBlobValidator: TInterface<SignedIdentityKeysBlob> =
  tShape({
    payload: t.String,
    signature: t.String,
  });

const olmIdentityKeysValidator: TInterface<OLMIdentityKeys> = tShape({
  ed25519: tRegex(primaryIdentityPublicKeyRegex),
  curve25519: tRegex(primaryIdentityPublicKeyRegex),
});

const identityKeysBlobValidator: TInterface<IdentityKeysBlob> = tShape({
  primaryIdentityPublicKeys: olmIdentityKeysValidator,
  notificationIdentityPublicKeys: olmIdentityKeysValidator,
});

async function getContentSigningKey(): Promise<string> {
  const { olmAPI } = getConfig();
  await olmAPI.initializeCryptoAccount();
  const {
    primaryIdentityPublicKeys: { ed25519 },
  } = await olmAPI.getUserPublicKey();
  return ed25519;
}

async function createOlmSessionsWithOwnDevices(
  authMetadata: AuthMetadata,
  identityClient: IdentityServiceClient,
  sendMessage: (message: ClientMessageToDevice) => Promise<void>,
): Promise<void> {
  const { olmAPI } = getConfig();
  const { userID, deviceID, accessToken } = authMetadata;
  await olmAPI.initializeCryptoAccount();

  if (!userID || !deviceID || !accessToken) {
    throw new Error('CommServicesAuthMetadata is missing');
  }

  const keysResponse = await identityClient.getOutboundKeysForUser(userID);

  for (const deviceKeys of keysResponse) {
    const { keys } = deviceKeys;
    if (!keys) {
      console.log(`Keys missing for device ${deviceKeys.deviceID}`);
      continue;
    }

    const { primaryIdentityPublicKeys } = keys.identityKeysBlob;

    if (primaryIdentityPublicKeys.ed25519 === deviceID) {
      continue;
    }
    const recipientDeviceID = primaryIdentityPublicKeys.ed25519;

    if (!keys.contentInitializationInfo.oneTimeKey) {
      console.log(`One-time key is missing for device ${recipientDeviceID}`);
      continue;
    }
    try {
      const encryptedContent = await olmAPI.contentOutboundSessionCreator(
        primaryIdentityPublicKeys,
        keys.contentInitializationInfo,
      );

      const sessionCreationMessage: OutboundSessionCreation = {
        type: peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION,
        senderInfo: {
          userID,
          deviceID,
        },
        encryptedContent,
      };

      await sendMessage({
        deviceID: recipientDeviceID,
        payload: JSON.stringify(sessionCreationMessage),
      });
      console.log(
        `Request to create a session with device ${recipientDeviceID} sent.`,
      );
    } catch (e) {
      console.log(
        'Error creating outbound session with ' +
          `device ${recipientDeviceID}: ${e.message}`,
      );
    }
  }
}

export {
  signedIdentityKeysBlobValidator,
  identityKeysBlobValidator,
  getContentSigningKey,
  createOlmSessionsWithOwnDevices,
};
