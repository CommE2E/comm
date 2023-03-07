// @flow

// The types of messages sent from app to worker
export const workerRequestMessageTypes = Object.freeze({
  PING: 0,
  INIT: 1,
  GENERATE_DATABASE_ENCRYPTION_KEY: 2,
});

export type PingWorkerRequestMessage = {
  +type: 0,
  +text: string,
};

export type InitWorkerRequestMessage = {
  +type: 1,
};

export type GenerateDatabaseEncryptionKeyRequestMessage = {
  +type: 2,
};

export type WorkerRequestMessage =
  | PingWorkerRequestMessage
  | InitWorkerRequestMessage
  | GenerateDatabaseEncryptionKeyRequestMessage;

export type WorkerRequestProxyMessage = {
  +id: number,
  +message: WorkerRequestMessage,
};

// The types of messages sent from worker to app
export const workerResponseMessageTypes = Object.freeze({
  PONG: 0,
});

export type PongWorkerResponseMessage = {
  +type: 0,
  +text: string,
};

export type WorkerResponseMessage = PongWorkerResponseMessage;

export type WorkerResponseProxyMessage = {
  +id: number,
  +message: WorkerResponseMessage,
  +error?: Error,
};

// SharedWorker types
export type SharedWorkerMessageEvent = MessageEvent & {
  +ports: $ReadOnlyArray<MessagePort>,
};
