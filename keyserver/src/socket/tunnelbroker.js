// @flow

import WebSocket from 'ws';

import {
  type TBKeyserverConnectionInitializationMessage,
  type TBRefreshKeysRequest,
} from 'lib/types/tunnelbroker-messages.js';
import sleep from 'lib/utils/sleep.js';

import { fetchOlmAccount } from '../updaters/olm-account-updater.js';
import { type IdentityInfo } from '../user/identity.js';
import { uploadNewOneTimeKeys } from '../utils/olm-utils.js';

async function createAndMaintainTunnelbrokerWebsocket(
  identityInfo: IdentityInfo,
) {
  const accountInfo = await fetchOlmAccount('content');
  const deviceId = JSON.parse(accountInfo.account.identity_keys()).curve25519;

  await openTunnelbrokerConnection(
    deviceId,
    identityInfo.userId,
    identityInfo.accessToken,
  );
}

async function handleTBMessageEvent(event: MessageEvent) {
  if (typeof event.data !== 'string') {
    return;
  }

  // Currently, there is only one message type which is sent from tunnelbroker
  const content: string = event.data;
  const message: TBRefreshKeysRequest = JSON.parse(content);

  await uploadNewOneTimeKeys(message.numberOfKeys);
}

function openTunnelbrokerConnection(
  deviceId: string,
  userId: string,
  accessToken: string,
) {
  try {
    const tunnelbrokerSocket = new WebSocket('ws://localhost:51001');

    tunnelbrokerSocket.on('open', () => {
      const message: TBKeyserverConnectionInitializationMessage = {
        type: 'sessionRequest',
        accessToken,
        deviceId,
        deviceType: 'keyserver',
        userId,
      };

      tunnelbrokerSocket.send(JSON.stringify(message));
      console.info('Connection to tunnelbroker established');
    });

    tunnelbrokerSocket.on('close', async () => {
      console.warn('Connection to tunnelbroker closed');
      await sleep(1000);
      console.info('Attempting to re-establish tunnelbroker connection');
      openTunnelbrokerConnection(deviceId, userId, accessToken);
    });

    tunnelbrokerSocket.on('error', (error: Error) => {
      console.error('Tunnelbroker socket error: ' + error.message);
    });

    tunnelbrokerSocket.on('message', handleTBMessageEvent);
  } catch (err) {
    console.log('Failed to open connection with tunnelbroker');
  }
}

export { createAndMaintainTunnelbrokerWebsocket };
