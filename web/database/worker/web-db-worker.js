// @flow

import localforage from 'localforage';

import {
  type SharedWorkerMessageEvent,
  type WorkerRequestMessage,
  type WorkerResponseMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
  type WorkerRequestProxyMessage,
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
  const port: MessagePort = event.ports[0];
  console.log('Web database worker alive!');

  port.onmessage = async function (messageEvent: MessageEvent) {
    const data: WorkerRequestProxyMessage = (messageEvent.data: any);
    const { id, message } = data;

    if (!id) {
      port.postMessage({
        error: new Error('Request without identifier'),
      });
    }

    try {
      const result = processAppRequest(message);
      port.postMessage({
        id,
        message: result,
      });
    } catch (e) {
      port.postMessage({
        id,
        error: e,
      });
    }
  };
}

self.addEventListener('connect', connectHandler);
