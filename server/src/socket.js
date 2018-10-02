// @flow

import type { WebSocket } from 'ws';
import type { $Request } from 'express';

function onConnection(ws: WebSocket, req: $Request) {
  console.log(req.cookies);
  ws.on('message', function incoming(message) {
    console.log(message);
  });
  console.log('onConnection???');

  ws.send('something');
}

export {
  onConnection,
};
