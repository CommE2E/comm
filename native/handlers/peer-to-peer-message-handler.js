// @flow

import { getOneTimeKeyValues } from 'lib/shared/crypto-utils.js';
import {
  type PeerToPeerMessage,
  peerToPeerMessageTypes,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';

import { commCoreModule, commRustModule } from '../native-modules.js';
import { nativeInboundContentSessionCreator } from '../utils/crypto-utils.js';

async function peerToPeerMessageHandler(
  message: PeerToPeerMessage,
): Promise<void> {
  if (message.type === peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION) {
    try {
      const result = await nativeInboundContentSessionCreator(message);
      console.log(
        'Created inbound session with device ' +
          `${message.senderInfo.deviceID}: ${result}`,
      );
    } catch (e) {
      console.log(
        'Error creating inbound session with device ' +
          `${message.senderInfo.deviceID}: ${e.message}`,
      );
    }
  } else if (message.type === peerToPeerMessageTypes.ENCRYPTED_MESSAGE) {
    try {
      await commCoreModule.initializeCryptoAccount();
      const decrypted = await commCoreModule.decrypt(
        message.encryptedContent,
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
    await commCoreModule.initializeCryptoAccount();
    const [
      { userID, deviceID, accessToken },
      notificationsOneTimeKeys,
      primaryOneTimeKeys,
    ] = await Promise.all([
      commCoreModule.getCommServicesAuthMetadata(),
      commCoreModule.getNotificationsOneTimeKeys(message.numberOfKeys),
      commCoreModule.getPrimaryOneTimeKeys(message.numberOfKeys),
    ]);

    if (!userID || !deviceID || !accessToken) {
      console.log(
        'CommServicesAuthMetadata is missing when uploading one-time keys',
      );
      return;
    }

    try {
      await commRustModule.uploadOneTimeKeys(
        userID,
        deviceID,
        accessToken,
        getOneTimeKeyValues(primaryOneTimeKeys),
        getOneTimeKeyValues(notificationsOneTimeKeys),
      );
    } catch (e) {
      console.log(`Error uploading one-time keys: ${e.message}`);
    }
  }
}

export { peerToPeerMessageHandler };
