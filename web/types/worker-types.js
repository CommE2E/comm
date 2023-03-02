// @flow

// The types of messages sent from app to worker
export const workerRequestMessageTypes = Object.freeze({
  PING: 0,
});

export type PingWorkerRequestMessage = {
  +type: 0,
  +text: string,
};

export type WorkerRequestMessage = PingWorkerRequestMessage;

// The types of messages sent from worker to app
export const workerResponseMessageTypes = Object.freeze({
  PONG: 0,
});

export type ErrorWorkerResponseMessage = {
  +error: Error,
};
export type PongWorkerResponseMessage = {
  +type: 0,
  +text: string,
};

export type WorkerResponseMessage =
  | PongWorkerResponseMessage
  | ErrorWorkerResponseMessage;

// SharedWorker types
export type SharedWorkerMessageEvent = MessageEvent & {
  +ports: $ReadOnlyArray<MessagePort>,
};
