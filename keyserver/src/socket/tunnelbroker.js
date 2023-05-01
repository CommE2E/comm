// @flow
import WebSocket from 'ws';

import { SessionRequestMessage } from 'lib/types/tunnelbroker-messages.js';

function createTunnelbrokerWebsocket() {
  try {
    const tunnelbrokerSocket = new WebSocket('ws://localhost:51001');
    tunnelbrokerSocket.on('open', () => {
      // TODO: Replace keyserver details with actual details
      const message: SessionRequestMessage = {
        type: 'sessionRequest',
        accessToken: 'foobar',
        deviceId: 'foo',
        deviceType: 'keyserver',
      };
      console.log(
        'Sending message to tunnelbroker: ' + JSON.stringify(message),
      );
      tunnelbrokerSocket.send(JSON.stringify(message));
    });

    tunnelbrokerSocket.on('message', message => {
      // TODO: Handle RefreshKeyMessage
      console.log('Received message from tunnelbroker: {}' + message);
    });

    tunnelbrokerSocket.on('close', () => {
      console.log('Connection to tunnelbroker closed');
    });

    tunnelbrokerSocket.on('error', event => {
      console.log('Tunnelbroker socket error: ' + event.message);
    });
  } catch (err) {
    console.log('Failed to open connection with tunnelbroker');
  }
}

export { createTunnelbrokerWebsocket };
