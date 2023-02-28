// @flow

import localforage from 'localforage';

import { type SharedWorkerMessageEvent } from '../../types/worker-types.js';

const localforageConfig: PartialConfig = {
  driver: localforage.INDEXEDDB,
  name: 'comm',
  storeName: 'commStorage',
  description: 'Comm encrypted database storage',
  version: '1.0',
};
localforage.config(localforageConfig);

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
