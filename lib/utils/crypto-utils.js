// @flow

import t from 'tcomb';
import { type TInterface } from 'tcomb';

import { getConfig } from './config.js';
import { getMessageForException } from './errors.js';
import { primaryIdentityPublicKeyRegex } from './siwe-utils.js';
import { tRegex, tShape } from './validation-utils.js';
import { type DeviceSessionCreationRequest } from '../components/peer-olm-session-creator-provider.react.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';
import type { TunnelbrokerClientMessageToDevice } from '../tunnelbroker/tunnelbroker-context.js';
import type {
  IdentityKeysBlob,
  OLMIdentityKeys,
  OutboundSessionCreationResult,
  SignedIdentityKeysBlob,
} from '../types/crypto-types.js';
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
  sendMessage: (message: TunnelbrokerClientMessageToDevice) => Promise<void>,
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

    try {
      const { sessionVersion, encryptedData } =
        await olmAPI.contentOutboundSessionCreator(
          primaryIdentityPublicKeys,
          keys.contentInitializationInfo,
        );

      const sessionCreationMessage: OutboundSessionCreation = {
        type: peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION,
        senderInfo: {
          userID,
          deviceID,
        },
        encryptedData,
        sessionVersion,
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

export type SessionCreationOptions = {
  +overwriteNotifSession?: boolean,
  +overwriteContentSession?: boolean,
};
async function createOlmSessionsWithUser(
  authMetadata: AuthMetadata,
  identityClient: IdentityServiceClient,
  sendMessage: (message: TunnelbrokerClientMessageToDevice) => Promise<void>,
  userID: string,
  devices: $ReadOnlyArray<DeviceSessionCreationRequest>,
): Promise<void> {
  const { olmAPI } = getConfig();
  await olmAPI.initializeCryptoAccount();

  const {
    userID: authUserID,
    deviceID: authDeviceID,
    accessToken,
  } = authMetadata;
  if (!authUserID || !authDeviceID || !accessToken) {
    throw new Error('CommServicesAuthMetadata is missing');
  }

  const filteredDevices: $ReadOnlyArray<{
    +deviceID: string,
    +hasContentSession: boolean,
    +hasNotifsSession: boolean,
  }> = await Promise.all(
    devices.map(request =>
      (async () => {
        const [hasContentSession, hasNotifsSession] = await Promise.all([
          (async () => {
            if (request.sessionCreationOptions?.overwriteContentSession) {
              return false;
            }
            return await olmAPI.isContentSessionInitialized(request.deviceID);
          })(),
          (async () => {
            if (request.sessionCreationOptions?.overwriteNotifSession) {
              return false;
            }
            return await olmAPI.isDeviceNotificationsSessionInitialized(
              request.deviceID,
            );
          })(),
        ]);
        return {
          deviceID: request.deviceID,
          hasContentSession,
          hasNotifsSession,
        };
      })(),
    ),
  );

  const sessionCreationNeeded = filteredDevices.some(
    device => !device.hasContentSession || !device.hasNotifsSession,
  );
  if (!sessionCreationNeeded) {
    return;
  }

  const keysResponse = await identityClient.getOutboundKeysForUser(userID);

  const devicePromises = filteredDevices.map(async sessionRequest => {
    try {
      const { deviceID, hasContentSession, hasNotifsSession } = sessionRequest;
      const deviceKeysResponse = keysResponse.find(
        keys => keys.deviceID === deviceID,
      );

      if (!deviceKeysResponse || !deviceKeysResponse.keys) {
        console.log(`Keys missing for device ${deviceID}`);
        return;
      }
      const { keys } = deviceKeysResponse;

      const { primaryIdentityPublicKeys, notificationIdentityPublicKeys } =
        keys.identityKeysBlob;
      const recipientDeviceID = primaryIdentityPublicKeys.ed25519;

      if (hasContentSession) {
        await olmAPI.notificationsOutboundSessionCreator(
          recipientDeviceID,
          notificationIdentityPublicKeys,
          keys.notifInitializationInfo,
        );
        return;
      }

      let outboundSessionCreationResult: OutboundSessionCreationResult;
      if (hasNotifsSession) {
        outboundSessionCreationResult =
          await olmAPI.contentOutboundSessionCreator(
            primaryIdentityPublicKeys,
            keys.contentInitializationInfo,
          );
      } else {
        [outboundSessionCreationResult] = await Promise.all([
          await olmAPI.contentOutboundSessionCreator(
            primaryIdentityPublicKeys,
            keys.contentInitializationInfo,
          ),
          olmAPI.notificationsOutboundSessionCreator(
            recipientDeviceID,
            notificationIdentityPublicKeys,
            keys.notifInitializationInfo,
          ),
        ]);
      }

      const { sessionVersion, encryptedData } = outboundSessionCreationResult;

      const sessionCreationMessage: OutboundSessionCreation = {
        type: peerToPeerMessageTypes.OUTBOUND_SESSION_CREATION,
        senderInfo: {
          userID: authUserID,
          deviceID: authDeviceID,
        },
        encryptedData,
        sessionVersion,
      };

      await sendMessage({
        deviceID: recipientDeviceID,
        payload: JSON.stringify(sessionCreationMessage),
      });
      console.log(
        `Request to create a session with device ${recipientDeviceID} sent.`,
      );
    } catch (e) {
      console.error(
        `Error creating session with ${sessionRequest.deviceID}: ${
          getMessageForException(e) ?? 'unknown error'
        }`,
      );
    }
  });
  await Promise.all(devicePromises);
}

export {
  signedIdentityKeysBlobValidator,
  identityKeysBlobValidator,
  getContentSigningKey,
  createOlmSessionsWithOwnDevices,
  createOlmSessionsWithUser,
};
