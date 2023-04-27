// @flow
import WebSocket from 'ws';

function createTunnelbrokerWebsocket() {
  try {
    const tunnelbrokerSocket = new WebSocket('ws://localhost:51001');
    tunnelbrokerSocket.onopen = () => {
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
    };

    tunnelbrokerSocket.onmessage = message => {
      // TODO: Handle RefreshKeyMessage
      console.log('Received message from tunnelbroker: {}' + message);
    };

    tunnelbrokerSocket.close = () => {
      console.log('Connection to tunnelbroker closed');
    };

    tunnelbrokerSocket.onerror = event => {
      console.log('Tunnelbroker socket error: ' + event.message);
    };
  } catch (err) {
    console.log('Failed to open connection with tunnelbroker');
  }
}

export { createTunnelbrokerWebsocket };
