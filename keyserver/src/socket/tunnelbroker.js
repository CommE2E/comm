// @flow

import WebSocket from 'ws';

import { type TBConnectionInitializationMessage } from 'lib/types/tunnelbroker-messages.js';

function createTunnelbrokerWebsocket() {
  try {
    const tunnelbrokerSocket = new WebSocket('ws://localhost:51001');
    tunnelbrokerSocket.on('open', () => {
      // TODO: Replace keyserver details with actual details
      const message: TBConnectionInitializationMessage = {
        type: 'sessionRequest',
        accessToken: 'foobar',
        deviceID: 'foo',
        deviceType: 'keyserver',
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
