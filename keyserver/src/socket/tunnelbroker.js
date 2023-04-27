// @flow

import WebSocket from 'ws';

import { type TBKeyserverConnectionInitializationMessage } from 'lib/types/tunnelbroker-messages.js';
import sleep from 'lib/utils/sleep.js';

import { fetchOlmAccount } from '../updaters/olm-account-updater.js';
import type { IdentityInfo } from '../user/identity.js';

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

async function openTunnelbrokerConnection(
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

      console.log(
        'Sending message to tunnelbroker: ' + JSON.stringify(message),
      );
      tunnelbrokerSocket.send(JSON.stringify(message));
    });

    tunnelbrokerSocket.on('close', async () => {
      console.log('Connection to tunnelbroker closed');
      await sleep(1000);
      console.log('Attempting to re-establish tunnelbroker connection');
      openTunnelbrokerConnection(deviceId, userId, accessToken);
    });

    tunnelbrokerSocket.on('error', (error: Error) => {
      console.error('Tunnelbroker socket error: ' + error.message);
    });
  } catch (err) {
    console.log('Failed to open connection with tunnelbroker');
  }
}

export { createAndMaintainTunnelbrokerWebsocket };
