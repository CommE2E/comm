// @flow

import type {
  ClientDBStore,
  ClientDBStoreOperations,
} from 'lib/types/store-ops-types.js';

// The types of messages sent from app to worker
export const workerRequestMessageTypes = Object.freeze({
  PING: 0,
  INIT: 1,
  GENERATE_DATABASE_ENCRYPTION_KEY: 2,
  PROCESS_STORE_OPERATIONS: 3,
  GET_CLIENT_STORE: 4,
});

export type PingWorkerRequestMessage = {
  +type: 0,
  +text: string,
};

export type InitWorkerRequestMessage = {
  +type: 1,
  +sqljsFilePath: string,
  +sqljsFilename: ?string,
};

export type GenerateDatabaseEncryptionKeyRequestMessage = {
  +type: 2,
};

export type ProcessStoreOperationsRequestMessage = {
  +type: 3,
  +storeOperations: ClientDBStoreOperations,
};

export type GetClientStoreRequestMessage = {
  +type: 4,
};

export type WorkerRequestMessage =
  | PingWorkerRequestMessage
  | InitWorkerRequestMessage
  | GenerateDatabaseEncryptionKeyRequestMessage
  | ProcessStoreOperationsRequestMessage
  | GetClientStoreRequestMessage;

export type WorkerRequestProxyMessage = {
  +id: number,
  +message: WorkerRequestMessage,
};

// The types of messages sent from worker to app
export const workerResponseMessageTypes = Object.freeze({
  PONG: 0,
  CLIENT_STORE: 1,
});

export type PongWorkerResponseMessage = {
  +type: 0,
  +text: string,
};

export type ClientStoreResponseMessage = {
  +type: 1,
  +store: ClientDBStore,
};

export type WorkerResponseMessage =
  | PongWorkerResponseMessage
  | ClientStoreResponseMessage;

export type WorkerResponseProxyMessage = {
  +id?: number,
  +message?: WorkerResponseMessage,
  +error?: Error,
};

// SharedWorker types
export type SharedWorkerMessageEvent = MessageEvent & {
  +ports: $ReadOnlyArray<MessagePort>,
  ...
};
