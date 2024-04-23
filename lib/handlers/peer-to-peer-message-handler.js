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
import { getContentSigningKey } from '../utils/crypto-utils.js';
import { hasHigherDeviceID, olmSessionErrors } from '../utils/olm-utils.js';

async function peerToPeerMessageHandler(
  message: PeerToPeerMessage,
  identityClient: IdentityServiceClient,
  messageID: string,
): Promise<void> {
  const { olmAPI } = getConfig();
  if (message.type === peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION) {
    const { senderInfo, encryptedData, sessionVersion } = message;
    const { userID: senderUserID, deviceID: senderDeviceID } = senderInfo;

    let deviceKeys: ?DeviceOlmInboundKeys = null;
    try {
      const { keys } = await identityClient.getInboundKeysForUser(senderUserID);
      deviceKeys = keys[senderDeviceID];
    } catch (e) {
      console.log(e.message);
    }

    if (!deviceKeys) {
      console.log(
        'Error creating inbound session with device ' +
          `${senderDeviceID}: No keys for the device, ` +
          `session version: ${sessionVersion}`,
      );
      return;
    }

    try {
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
        const currentDeviceID = await getContentSigningKey();
        if (hasHigherDeviceID(currentDeviceID, senderDeviceID)) {
          console.log(
            'Race condition while creating session with ' +
              `${senderDeviceID}, session version: ${sessionVersion}, ` +
              `this device has a higher deviceID and the session will be kept`,
          );
        } else {
          const result = await olmAPI.contentInboundSessionCreator(
            deviceKeys.identityKeysBlob.primaryIdentityPublicKeys,
            encryptedData,
            sessionVersion,
            true,
          );
          console.log(
            'Overwrite session with device ' +
              `${senderDeviceID}: ${result}, ` +
              `session version: ${sessionVersion}`,
          );
          // Resend all not-yet confirmed messages that were encrypted
          // with overwrite session. Tracked in ENG-6982.
        }
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
      const decrypted = await olmAPI.decryptSequentialAndPersist(
        message.encryptedData,
        message.senderInfo.deviceID,
        messageID,
      );
      console.log(
        'Decrypted message from device ' +
          `${message.senderInfo.deviceID}: ${decrypted}`,
      );
    } catch (e) {
      if (e.message?.includes(olmSessionErrors.messageAlreadyDecrypted)) {
        console.log(
          'Received already decrypted message from device ' +
            `${message.senderInfo.deviceID}.`,
        );
      } else if (e.message?.includes(olmSessionErrors.messageOutOfOrder)) {
        console.log(
          'Received out-of-order message from device ' +
            `${message.senderInfo.deviceID}.`,
        );
      } else {
        console.log(
          'Error decrypting message from device ' +
            `${message.senderInfo.deviceID}: ${e.message}`,
        );
      }
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
