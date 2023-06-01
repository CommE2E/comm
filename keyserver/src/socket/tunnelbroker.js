// @flow

import WebSocket from 'ws';

import { type TBKeyserverConnectionInitializationMessage } from 'lib/types/tunnelbroker-messages.js';
import sleep from 'lib/utils/sleep.js';

import { fetchOlmAccount } from '../updaters/olm-account-updater.js';

async function getDeviceID(): Promise<string> {
  const info = await fetchOlmAccount('content');
  return JSON.parse(info.account.identity_keys()).ed25519;
}

async function createAndMaintainTunnelbrokerWebsocket() {
  // TODO: Fetch accessToken and userID details with actual details
  const [deviceID] = await Promise.all([getDeviceID()]);

  await openTunnelbrokerConnection(deviceID, 'alice', 'access_token');
}

async function openTunnelbrokerConnection(
  deviceID: string,
  userID: string,
  accessToken: string,
) {
  try {
    const tunnelbrokerSocket = new WebSocket('ws://localhost:51001');
    tunnelbrokerSocket.on('open', async () => {
      const message: TBKeyserverConnectionInitializationMessage = {
        type: 'sessionRequest',
        accessToken,
        deviceID,
        deviceType: 'keyserver',
        userID,
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
      openTunnelbrokerConnection(deviceID, userID, accessToken);
    });

    tunnelbrokerSocket.on('error', (error: Error) => {
      console.error('Tunnelbroker socket error: ' + error.message);
    });
  } catch (err) {
    console.log('Failed to open connection with tunnelbroker');
  }
}

export { createAndMaintainTunnelbrokerWebsocket };
