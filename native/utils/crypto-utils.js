// @flow

import { type ClientMessageToDevice } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type {
  IdentityKeysBlob,
  OLMIdentityKeys,
} from 'lib/types/crypto-types.js';
import type { OutboundKeyInfoResponse } from 'lib/types/identity-service-types';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';
import {
  type OutboundSessionCreation,
  peerToPeerMessageTypes,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';

import { commCoreModule, commRustModule } from '../native-modules.js';

function nativeNotificationsSessionCreator(
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
  keyserverID: string,
): Promise<string> {
  const { prekey, prekeySignature, oneTimeKey } =
    notificationsInitializationInfo;
  return commCoreModule.initializeNotificationsSession(
    JSON.stringify(notificationsIdentityKeys),
    prekey,
    prekeySignature,
    oneTimeKey,
    keyserverID,
  );
}

async function getContentSigningKey(): Promise<string> {
  await commCoreModule.initializeCryptoAccount();
  const {
    primaryIdentityPublicKeys: { ed25519 },
  } = await commCoreModule.getUserPublicKey();
  return ed25519;
}

function nativeOutboundContentSessionCreator(
  contentIdentityKeys: OLMIdentityKeys,
  contentInitializationInfo: OlmSessionInitializationInfo,
  deviceID: string,
): Promise<string> {
  const { prekey, prekeySignature, oneTimeKey } = contentInitializationInfo;
  const identityKeys = JSON.stringify({
    curve25519: contentIdentityKeys.curve25519,
    ed25519: contentIdentityKeys.ed25519,
  });

  return commCoreModule.initializeContentOutboundSession(
    identityKeys,
    prekey,
    prekeySignature,
    oneTimeKey,
    deviceID,
  );
}

async function createOlmSessionsWithOwnDevices(
  sendMessage: (message: ClientMessageToDevice) => Promise<void>,
): Promise<void> {
  const authMetadata = await commCoreModule.getCommServicesAuthMetadata();
  const { userID, deviceID, accessToken } = authMetadata;
  if (!userID || !deviceID || !accessToken) {
    throw new Error('CommServicesAuthMetadata is missing');
  }

  await commCoreModule.initializeCryptoAccount();
  const keysResponse = await commRustModule.getOutboundKeysForUser(
    userID,
    deviceID,
    accessToken,
    userID,
  );

  const outboundKeys: OutboundKeyInfoResponse[] = JSON.parse(keysResponse);

  for (const deviceKeys: OutboundKeyInfoResponse of outboundKeys) {
    const keysPayload: IdentityKeysBlob = JSON.parse(deviceKeys.payload);

    if (keysPayload.primaryIdentityPublicKeys.ed25519 === deviceID) {
      continue;
    }
    const recipientDeviceID = keysPayload.primaryIdentityPublicKeys.ed25519;
    if (!deviceKeys.oneTimeContentPrekey) {
      console.log(`One-time key is missing for device ${recipientDeviceID}`);
      continue;
    }
    try {
      const encryptedContent = await nativeOutboundContentSessionCreator(
        keysPayload.primaryIdentityPublicKeys,
        {
          prekey: deviceKeys.contentPrekey,
          prekeySignature: deviceKeys.contentPrekeySignature,
          oneTimeKey: deviceKeys.oneTimeContentPrekey,
        },
        recipientDeviceID,
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
  getContentSigningKey,
  nativeNotificationsSessionCreator,
  createOlmSessionsWithOwnDevices,
  nativeOutboundContentSessionCreator,
};
