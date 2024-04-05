// @flow

import type {
  IdentityServiceClient,
  DeviceOlmInboundKeys,
} from '../types/identity-service-types.js';
import {
  peerToPeerMessageTypes,
  type PeerToPeerMessage,
} from '../types/tunnelbroker/peer-to-peer-message-types.js';
import { getConfig } from '../utils/config.js';

async function peerToPeerMessageHandler(
  message: PeerToPeerMessage,
  identityClient: IdentityServiceClient,
): Promise<void> {
  const { olmAPI } = getConfig();
  if (message.type === peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION) {
    try {
      const { senderInfo, encryptedData, sessionVersion } = message;
      const { keys } = await identityClient.getInboundKeysForUser(
        senderInfo.userID,
      );

      const deviceKeys: ?DeviceOlmInboundKeys = keys[senderInfo.deviceID];
      if (!deviceKeys) {
        throw new Error(
          'No keys for the device that requested creating a session, ' +
            `deviceID: ${senderInfo.deviceID}`,
        );
      }

      await olmAPI.initializeCryptoAccount();
      const result = await olmAPI.contentInboundSessionCreator(
        deviceKeys.identityKeysBlob.primaryIdentityPublicKeys,
        encryptedData,
        sessionVersion,
      );
      console.log(
        'Created inbound session with device ' +
          `${message.senderInfo.deviceID}: ${result}, ` +
          `session version: ${sessionVersion}`,
      );
    } catch (e) {
      console.log(
        'Error creating inbound session with device ' +
          `${message.senderInfo.deviceID}: ${e.message}`,
      );
    }
  } else if (message.type === peerToPeerMessageTypes.ENCRYPTED_MESSAGE) {
    try {
      await olmAPI.initializeCryptoAccount();
      const decrypted = await olmAPI.decrypt(
        message.encryptedData,
        message.senderInfo.deviceID,
      );
      console.log(
        'Decrypted message from device ' +
          `${message.senderInfo.deviceID}: ${decrypted}`,
      );
    } catch (e) {
      console.log(
        'Error decrypting message from device ' +
          `${message.senderInfo.deviceID}: ${e.message}`,
      );
    }
  } else if (message.type === peerToPeerMessageTypes.REFRESH_KEY_REQUEST) {
    try {
      await olmAPI.initializeCryptoAccount();
      const oneTimeKeys = await olmAPI.getOneTimeKeys(message.numberOfKeys);
      await identityClient.uploadOneTimeKeys(oneTimeKeys);
    } catch (e) {
      console.log(`Error uploading one-time keys: ${e.message}`);
    }
  }
}

export { peerToPeerMessageHandler };
