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
  SET_CURRENT_USER_ID: 5,
  GET_CURRENT_USER_ID: 6,
  GET_PERSIST_STORAGE_ITEM: 7,
  SET_PERSIST_STORAGE_ITEM: 8,
  REMOVE_PERSIST_STORAGE_ITEM: 9,
});

export const workerWriteRequests: $ReadOnlyArray<number> = [
  workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
  workerRequestMessageTypes.SET_CURRENT_USER_ID,
  workerRequestMessageTypes.SET_PERSIST_STORAGE_ITEM,
  workerRequestMessageTypes.REMOVE_PERSIST_STORAGE_ITEM,
];

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

export type SetCurrentUserIDRequestMessage = {
  +type: 5,
  +userID: string,
};

export type GetCurrentUserIDRequestMessage = {
  +type: 6,
};

export type GetPersistStorageItemRequestMessage = {
  +type: 7,
  +key: string,
};

export type SetPersistStorageItemRequestMessage = {
  +type: 8,
  +key: string,
  +item: string,
};

export type RemovePersistStorageItemRequestMessage = {
  +type: 9,
  +key: string,
};

export type WorkerRequestMessage =
  | PingWorkerRequestMessage
  | InitWorkerRequestMessage
  | GenerateDatabaseEncryptionKeyRequestMessage
  | ProcessStoreOperationsRequestMessage
  | GetClientStoreRequestMessage
  | SetCurrentUserIDRequestMessage
  | GetCurrentUserIDRequestMessage
  | GetPersistStorageItemRequestMessage
  | SetPersistStorageItemRequestMessage
  | RemovePersistStorageItemRequestMessage;

export type WorkerRequestProxyMessage = {
  +id: number,
  +message: WorkerRequestMessage,
};

// The types of messages sent from worker to app
export const workerResponseMessageTypes = Object.freeze({
  PONG: 0,
  CLIENT_STORE: 1,
  GET_CURRENT_USER_ID: 2,
  GET_PERSIST_STORAGE_ITEM: 3,
});

export type PongWorkerResponseMessage = {
  +type: 0,
  +text: string,
};

export type ClientStoreResponseMessage = {
  +type: 1,
  +store: ClientDBStore,
};

export type GetCurrentUserIDResponseMessage = {
  +type: 2,
  +userID: ?string,
};

export type GetPersistStorageItemResponseMessage = {
  +type: 3,
  +item: string,
};

export type WorkerResponseMessage =
  | PongWorkerResponseMessage
  | ClientStoreResponseMessage
  | GetCurrentUserIDResponseMessage
  | GetPersistStorageItemResponseMessage;

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
