// @flow

import WebSocket from 'ws';

import { type TBKeyserverConnectionInitializationMessage } from 'lib/types/tunnelbroker-messages.js';

import { fetchOlmAccount } from '../updaters/olm-account-updater.js';

async function getDeviceID(): Promise<string> {
  const info = await fetchOlmAccount('content');
  return JSON.parse(info.account.identity_keys()).curve25519;
}

function createTunnelbrokerWebsocket() {
  try {
    const tunnelbrokerSocket = new WebSocket('ws://localhost:51001');
    tunnelbrokerSocket.on('open', async () => {
      const [deviceID] = await Promise.all([getDeviceID()]);

      // TODO: Replace accessToken and userID details with actual details
      const message: TBKeyserverConnectionInitializationMessage = {
        type: 'sessionRequest',
        accessToken: 'foobar',
        deviceID,
        deviceType: 'keyserver',
        userID: 'alice',
      };
      console.log(
        'Sending message to tunnelbroker: ' + JSON.stringify(message),
      );
      tunnelbrokerSocket.send(JSON.stringify(message));
    });

    tunnelbrokerSocket.on('close', () => {
      console.log('Connection to tunnelbroker closed');
    });

    tunnelbrokerSocket.on('error', (error: Error) => {
      console.error('Tunnelbroker socket error: ' + error.message);
    });
  } catch (err) {
    console.log('Failed to open connection with tunnelbroker');
  }
}

export { createTunnelbrokerWebsocket };
