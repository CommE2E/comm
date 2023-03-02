// @flow

import localforage from 'localforage';

import {
  type SharedWorkerMessageEvent,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
} from '../../types/worker-types.js';

const localforageConfig: PartialConfig = {
  driver: localforage.INDEXEDDB,
  name: 'comm',
  storeName: 'commStorage',
  description: 'Comm encrypted database storage',
  version: '1.0',
};
localforage.config(localforageConfig);

function processAppRequest(
  message: WorkerRequestMessage,
): ?WorkerResponseMessage {
  if (message.type === workerRequestMessageTypes.PING) {
    return {
      type: workerResponseMessageTypes.PONG,
      text: 'PONG',
    };
  }

  throw new Error('Request type not supported');
}

function connectHandler(event: SharedWorkerMessageEvent) {
  if (!event.ports.length) {
    return;
  }
  const port: MessagePort = event.ports[0];
  console.log('Web database worker alive!');

  port.onmessage = async function (messageEvent: MessageEvent) {
    const message: WorkerRequestMessage = (messageEvent.data: any);

    try {
      const result = processAppRequest(message);
      port.postMessage(result);
    } catch (e) {
      port.postMessage({
        error: e,
      });
    }
  };
}

self.addEventListener('connect', connectHandler);
