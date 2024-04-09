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
import { olmSessionErrors } from '../utils/olm-utils.js';

async function peerToPeerMessageHandler(
  message: PeerToPeerMessage,
  identityClient: IdentityServiceClient,
): Promise<void> {
  const { olmAPI } = getConfig();
  if (message.type === peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION) {
    const { senderInfo, encryptedData, sessionVersion } = message;
    const { userID: senderUserID, deviceID: senderDeviceID } = senderInfo;
    try {
      const { keys } = await identityClient.getInboundKeysForUser(senderUserID);

      const deviceKeys: ?DeviceOlmInboundKeys = keys[senderDeviceID];
      if (!deviceKeys) {
        throw new Error(
          'No keys for the device that requested creating a session, ' +
            `deviceID: ${senderDeviceID}`,
        );
      }

      await olmAPI.initializeCryptoAccount();
      const result = await olmAPI.contentInboundSessionCreator(
        deviceKeys.identityKeysBlob.primaryIdentityPublicKeys,
        encryptedData,
        sessionVersion,
        false,
      );
      console.log(
        'Created inbound session with device ' +
          `${senderDeviceID}: ${result}, ` +
          `session version: ${sessionVersion}`,
      );
    } catch (e) {
      if (e.message?.includes(olmSessionErrors.alreadyCreated)) {
        console.log(
          'Received session request with lower session version from ' +
            `${senderDeviceID}, session version: ${sessionVersion}`,
        );
      } else if (e.message?.includes(olmSessionErrors.raceCondition)) {
        console.log(
          'Race condition while creating session with ' +
            `${senderDeviceID}, session version: ${sessionVersion}`,
        );
      } else {
        console.log(
          'Error creating inbound session with device ' +
            `${senderDeviceID}: ${e.message}, ` +
            `session version: ${sessionVersion}`,
        );
      }
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
