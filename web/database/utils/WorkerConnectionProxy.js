// @flow

import type {
  WorkerRequestProxyMessage,
  WorkerResponseMessage,
  WorkerRequestMessage,
  WorkerResponseProxyMessage,
} from '../../types/worker-types.js';

type PromiseCallbacks = {
  +resolve: (result: ?WorkerResponseMessage) => void,
  +reject: (error: Error) => void,
};

// It's important to have only ONE instance of this object to make it work
class WorkerConnectionProxy {
  workerPort: MessagePort;
  messageId: number;
  promiseCallbacks: { [index: number]: PromiseCallbacks };
  // This function will be called when worker will send
  // a message with an error but without any app's request
  onError: (error: Error) => void;

  constructor(port: MessagePort, onError: (error: Error) => void) {
    this.workerPort = port;
    this.onError = onError;
    this.workerPort.onmessage = this.handleMessage;
    this.messageId = 1;
    this.promiseCallbacks = {};
  }

  handleMessage: (msg: MessageEvent) => void = (msg: MessageEvent) => {
    const data: WorkerResponseProxyMessage = (msg.data: any);
    const { id, error, message } = data;

    if (!id || !this.promiseCallbacks[id]) {
      if (error) {
        this.onError(error);
      } else if (message) {
        this.onError(new Error(`Unknown error for message: ${message.type}`));
      } else {
        this.onError(new Error('Unknown error'));
      }
      return;
    }

    const callbacks = this.promiseCallbacks[id];
    if (error) {
      callbacks.reject(error);
    } else {
      callbacks.resolve(message);
    }

    delete this.promiseCallbacks[id];
  };

  scheduleOnWorker(
    payload: WorkerRequestMessage,
  ): Promise<?WorkerResponseMessage> {
    const msgId = this.messageId++;
    const msg: WorkerRequestProxyMessage = {
      id: msgId,
      message: payload,
    };
    return new Promise((resolve, reject) => {
      this.promiseCallbacks[msgId] = {
        resolve,
        reject,
      };
      this.workerPort.postMessage(msg);
    });
  }
}

export default WorkerConnectionProxy;
