// @flow

import type {
  IdentityKeysBlob,
  OLMIdentityKeys,
} from 'lib/types/crypto-types.js';
import type { InboundKeyInfoResponse } from 'lib/types/identity-service-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';
import type { OutboundSessionCreation } from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';

import { commCoreModule, commRustModule } from '../native-modules.js';

function nativeNotificationsSessionCreator(
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
): Promise<string> {
  const { prekey, prekeySignature, oneTimeKey } =
    notificationsInitializationInfo;
  return commCoreModule.initializeNotificationsSession(
    JSON.stringify(notificationsIdentityKeys),
    prekey,
    prekeySignature,
    oneTimeKey,
  );
}

async function getContentSigningKey(): Promise<string> {
  await commCoreModule.initializeCryptoAccount();
  const {
    primaryIdentityPublicKeys: { ed25519 },
  } = await commCoreModule.getUserPublicKey();
  return ed25519;
}

async function nativeInboundContentSessionCreator(
  message: OutboundSessionCreation,
): Promise<string> {
  const { senderInfo, encryptedContent } = message;

  const authMetadata = await commCoreModule.getCommServicesAuthMetadata();
  const { userID, deviceID, accessToken } = authMetadata;
  if (!userID || !deviceID || !accessToken) {
    throw new Error('CommServicesAuthMetadata is missing');
  }

  const keysResponse = await commRustModule.getInboundKeysForUser(
    userID,
    deviceID,
    accessToken,
    senderInfo.userID,
  );

  const inboundKeys: InboundKeyInfoResponse[] = JSON.parse(keysResponse);
  const deviceKeys: ?InboundKeyInfoResponse = inboundKeys.find(keys => {
    const keysPayload: IdentityKeysBlob = JSON.parse(keys.payload);
    return (
      keysPayload.primaryIdentityPublicKeys.ed25519 === senderInfo.deviceID
    );
  });

  if (!deviceKeys) {
    throw new Error(
      'No keys for the device that requested creating a session, ' +
        `deviceID: ${senderInfo.deviceID}`,
    );
  }
  const keysPayload: IdentityKeysBlob = JSON.parse(deviceKeys.payload);
  const identityKeys = JSON.stringify({
    curve25519: keysPayload.primaryIdentityPublicKeys.curve25519,
    ed25519: keysPayload.primaryIdentityPublicKeys.ed25519,
  });
  return commCoreModule.initializeContentInboundSession(
    identityKeys,
    encryptedContent,
    keysPayload.primaryIdentityPublicKeys.ed25519,
  );
}

export {
  getContentSigningKey,
  nativeNotificationsSessionCreator,
  nativeInboundContentSessionCreator,
};
