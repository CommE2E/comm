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
  const deviceID = JSON.parse(accountInfo.account.identity_keys()).ed25519;

  openTunnelbrokerConnection(
    deviceID,
    identityInfo.userId,
    identityInfo.accessToken,
  );
}

function openTunnelbrokerConnection(
  deviceID: string,
  userID: string,
  accessToken: string,
) {
  try {
    const tunnelbrokerSocket = new WebSocket('ws://127.0.0.1:51001');

    tunnelbrokerSocket.on('open', () => {
      const message: TBKeyserverConnectionInitializationMessage = {
        type: 'sessionRequest',
        accessToken,
        deviceId: deviceID,
        deviceType: 'keyserver',
        userId: userID,
      };

      tunnelbrokerSocket.send(JSON.stringify(message));
      console.info('Connection to Tunnelbroker established');
    });

    tunnelbrokerSocket.on('close', async () => {
      console.warn('Connection to Tunnelbroker closed');
      await sleep(1000);
      console.info('Attempting to re-establish Tunnelbroker connection');
      openTunnelbrokerConnection(deviceID, userID, accessToken);
    });

    tunnelbrokerSocket.on('error', (error: Error) => {
      console.error('Tunnelbroker socket error', error.message);
    });
  } catch {
    console.log('Failed to open connection with Tunnelbroker');
  }
}

export { createAndMaintainTunnelbrokerWebsocket };
