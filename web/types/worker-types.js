// @flow

import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import type {
  PickledOLMAccount,
  OLMIdentityKeys,
  OlmAPI,
} from 'lib/types/crypto-types.js';
import type { PlatformDetails } from 'lib/types/device-types.js';
import type {
  IdentityServiceClient,
  IdentityServiceAuthLayer,
} from 'lib/types/identity-service-types.js';
import type { ClientDBMessageInfo } from 'lib/types/message-types.js';
import type {
  InboundP2PMessage,
  OutboundP2PMessage,
} from 'lib/types/sqlite-types.js';
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
  STAMP_SQLITE_DB_USER_ID: 5,
  GET_SQLITE_STAMPED_USER_ID: 6,
  GET_PERSIST_STORAGE_ITEM: 7,
  SET_PERSIST_STORAGE_ITEM: 8,
  REMOVE_PERSIST_STORAGE_ITEM: 9,
  CLEAR_SENSITIVE_DATA: 10,
  BACKUP_RESTORE: 11,
  INITIALIZE_CRYPTO_ACCOUNT: 12,
  CREATE_IDENTITY_SERVICE_CLIENT: 13,
  CALL_IDENTITY_CLIENT_METHOD: 14,
  CALL_OLM_API_METHOD: 15,
  GET_INBOUND_P2P_MESSAGES: 16,
  REMOVE_INBOUND_P2P_MESSAGES: 17,
  GET_OUTBOUND_P2P_MESSAGES: 18,
  MARK_OUTBOUND_P2P_MESSAGE_AS_SENT: 19,
  REMOVE_OUTBOUND_P2P_MESSAGE: 20,
  GET_RELATED_MESSAGES: 21,
  GET_OUTBOUND_P2P_MESSAGES_BY_ID: 22,
  SEARCH_MESSAGES: 23,
  RESET_OUTBOUND_P2P_MESSAGES: 24,
  FETCH_MESSAGES: 25,
  GET_INBOUND_P2P_MESSAGES_BY_ID: 26,
});

export const workerWriteRequests: $ReadOnlyArray<number> = [
  workerRequestMessageTypes.PROCESS_STORE_OPERATIONS,
  workerRequestMessageTypes.STAMP_SQLITE_DB_USER_ID,
  workerRequestMessageTypes.SET_PERSIST_STORAGE_ITEM,
  workerRequestMessageTypes.REMOVE_PERSIST_STORAGE_ITEM,
  workerRequestMessageTypes.BACKUP_RESTORE,
  workerRequestMessageTypes.INITIALIZE_CRYPTO_ACCOUNT,
  workerRequestMessageTypes.REMOVE_INBOUND_P2P_MESSAGES,
  workerRequestMessageTypes.MARK_OUTBOUND_P2P_MESSAGE_AS_SENT,
  workerRequestMessageTypes.REMOVE_OUTBOUND_P2P_MESSAGE,
  workerRequestMessageTypes.RESET_OUTBOUND_P2P_MESSAGES,
];

export const workerOlmAPIRequests: $ReadOnlyArray<number> = [
  workerRequestMessageTypes.INITIALIZE_CRYPTO_ACCOUNT,
  workerRequestMessageTypes.CALL_OLM_API_METHOD,
];

export const workerIdentityClientRequests: $ReadOnlyArray<number> = [
  workerRequestMessageTypes.CREATE_IDENTITY_SERVICE_CLIENT,
  workerRequestMessageTypes.CALL_IDENTITY_CLIENT_METHOD,
];

export type PingWorkerRequestMessage = {
  +type: 0,
  +text: string,
};

export type InitWorkerRequestMessage = {
  +type: 1,
  +platformDetails: PlatformDetails,
  +webworkerModulesFilePath: string,
  +commQueryExecutorFilename: ?string,
  +encryptionKey?: ?SubtleCrypto$JsonWebKey,
  +backupClientFilename?: ?string,
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

export type ClearSensitiveDataRequestMessage = {
  +type: 10,
};

export type BackupRestoreRequestMessage = {
  +type: 11,
  +authMetadata: AuthMetadata,
  +backupID: string,
  +backupDataKey: string,
  +backupLogDataKey: string,
};

// Previously used on web in redux. Now only used
// in a migration to the shared worker.
export type LegacyCryptoStore = {
  +primaryAccount: PickledOLMAccount,
  +primaryIdentityKeys: OLMIdentityKeys,
  +notificationAccount: PickledOLMAccount,
  +notificationIdentityKeys: OLMIdentityKeys,
};
export type InitializeCryptoAccountRequestMessage = {
  +type: 12,
  +olmWasmPath: string,
  +initialCryptoStore?: LegacyCryptoStore,
};

export type CreateIdentityServiceClientRequestMessage = {
  +type: 13,
  +opaqueWasmPath: string,
  +authLayer: ?IdentityServiceAuthLayer,
};

export type CallIdentityClientMethodRequestMessage = {
  +type: 14,
  +method: $Keys<IdentityServiceClient>,
  +args: $ReadOnlyArray<mixed>,
};

export type CallOLMApiMethodRequestMessage = {
  +type: 15,
  +method: $Keys<OlmAPI>,
  +args: $ReadOnlyArray<mixed>,
};

export type GetInboundP2PMessagesRequestMessage = {
  +type: 16,
};

export type RemoveInboundP2PMessagesRequestMessage = {
  +type: 17,
  +ids: $ReadOnlyArray<string>,
};

export type GetOutboundP2PMessagesRequestMessage = {
  +type: 18,
};

export type MarkOutboundP2PMessageAsSentRequestMessage = {
  +type: 19,
  +messageID: string,
  +deviceID: string,
};

export type RemoveOutboundP2PMessageRequestMessage = {
  +type: 20,
  +messageID: string,
  +deviceID: string,
};

export type GetRelatedMessagesRequestMessage = {
  +type: 21,
  +messageID: string,
};

export type GetOutboundP2PMessagesByIDRequestMessage = {
  +type: 22,
  +messageIDs: $ReadOnlyArray<string>,
};

export type SearchMessagesRequestMessage = {
  +type: 23,
  +query: string,
  +threadID: string,
  +timestampCursor: ?string,
  +messageIDCursor: ?string,
};

export type ResetOutboundP2PMessagesRequestMessage = {
  +type: 24,
  +deviceID: string,
};

export type FetchMessagesRequestMessage = {
  +type: 25,
  +threadID: string,
  +limit: number,
  +offset: number,
};

export type GetInboundP2PMessagesByIDRequestMessage = {
  +type: 26,
  +messageIDs: $ReadOnlyArray<string>,
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
  | RemovePersistStorageItemRequestMessage
  | ClearSensitiveDataRequestMessage
  | BackupRestoreRequestMessage
  | InitializeCryptoAccountRequestMessage
  | CreateIdentityServiceClientRequestMessage
  | CallIdentityClientMethodRequestMessage
  | CallOLMApiMethodRequestMessage
  | GetInboundP2PMessagesRequestMessage
  | RemoveInboundP2PMessagesRequestMessage
  | GetOutboundP2PMessagesRequestMessage
  | MarkOutboundP2PMessageAsSentRequestMessage
  | RemoveOutboundP2PMessageRequestMessage
  | GetRelatedMessagesRequestMessage
  | GetOutboundP2PMessagesByIDRequestMessage
  | SearchMessagesRequestMessage
  | ResetOutboundP2PMessagesRequestMessage
  | FetchMessagesRequestMessage
  | GetInboundP2PMessagesByIDRequestMessage;

export type WorkerRequestProxyMessage = {
  +id: number,
  +message: WorkerRequestMessage,
};

// The types of messages sent from worker to app
export const workerResponseMessageTypes = Object.freeze({
  PONG: 0,
  CLIENT_STORE: 1,
  GET_SQLITE_STAMPED_USER_ID: 2,
  GET_PERSIST_STORAGE_ITEM: 3,
  CALL_IDENTITY_CLIENT_METHOD: 4,
  CALL_OLM_API_METHOD: 5,
  GET_INBOUND_P2P_MESSAGES: 6,
  GET_OUTBOUND_P2P_MESSAGES: 7,
  GET_MESSAGES: 8,
  RESET_OUTBOUND_P2P_MESSAGES: 9,
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

export type CallIdentityClientMethodResponseMessage = {
  +type: 4,
  +result: mixed,
};

export type CallOLMApiMethodResponseMessage = {
  +type: 5,
  +result: mixed,
};

export type GetInboundP2PMessagesResponseMessage = {
  +type: 6,
  +inboundP2PMessages: $ReadOnlyArray<InboundP2PMessage>,
};

export type GetOutboundP2PMessagesResponseMessage = {
  +type: 7,
  +outboundP2PMessages: $ReadOnlyArray<OutboundP2PMessage>,
};

export type GetMessagesResponse = {
  +type: 8,
  +messages: $ReadOnlyArray<ClientDBMessageInfo>,
};

export type ResetOutboundP2PMessagesResponseMessage = {
  +type: 9,
  +messageIDs: $ReadOnlyArray<string>,
};

export type WorkerResponseMessage =
  | PongWorkerResponseMessage
  | ClientStoreResponseMessage
  | GetCurrentUserIDResponseMessage
  | GetPersistStorageItemResponseMessage
  | CallIdentityClientMethodResponseMessage
  | CallOLMApiMethodResponseMessage
  | GetInboundP2PMessagesResponseMessage
  | GetOutboundP2PMessagesResponseMessage
  | GetMessagesResponse
  | ResetOutboundP2PMessagesResponseMessage;

export type WorkerResponseProxyMessage = {
  +id?: number,
  +message?: WorkerResponseMessage,
  +error?: string,
};

// SharedWorker types
export type SharedWorkerMessageEvent = MessageEvent & {
  +ports: $ReadOnlyArray<MessagePort>,
  ...
};
