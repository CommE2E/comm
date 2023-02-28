// @flow

import { type SharedWorkerMessageEvent } from '../../types/worker-types.js';

function connectHandler(event: SharedWorkerMessageEvent) {
  if (!event.ports.length) {
    return;
  }
  const port: MessagePort = event.ports[0];
  console.log('Web database worker alive!');

  port.onmessage = async function (messageEvent: MessageEvent) {
    console.log('message from main thread: ', messageEvent.data);

    port.postMessage({ message: 'response from worker' });
  };
}

self.addEventListener('connect', connectHandler);
