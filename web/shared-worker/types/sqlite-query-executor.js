// @flow

import type { ClientDBAuxUserInfo } from 'lib/ops/aux-user-store-ops.js';
import type { ClientDBCommunityInfo } from 'lib/ops/community-store-ops.js';
import type {
  ClientDBDMOperation,
  ClientDBQueuedDMOperation,
} from 'lib/ops/dm-operations-store-ops.js';
import type { ClientDBEntryInfo } from 'lib/ops/entries-store-ops.js';
import type { ClientDBIntegrityThreadHash } from 'lib/ops/integrity-store-ops.js';
import type { ClientDBKeyserverInfo } from 'lib/ops/keyserver-store-ops.js';
import type { ClientDBReport } from 'lib/ops/report-store-ops.js';
import type { ClientDBSyncedMetadataEntry } from 'lib/ops/synced-metadata-store-ops.js';
import type { ClientDBThreadActivityEntry } from 'lib/ops/thread-activity-store-ops.js';
import type { WebClientDBMessageStoreThread } from 'lib/ops/thread-store-ops.js';
import type { ClientDBUserInfo } from 'lib/ops/user-store-ops.js';
import type { ClientDBDraftInfo } from 'lib/types/draft-types.js';
import type { ClientDBHolderItem } from 'lib/types/holder-types.js';
import type { ClientDBLocalMessageInfo } from 'lib/types/message-types.js';
import type {
  OutboundP2PMessage,
  InboundP2PMessage,
} from 'lib/types/sqlite-types.js';

import { type WebClientDBThreadInfo } from './entities.js';
import type { EmscriptenVector } from '../utils/vector-utils.js';

export type WebMessage = {
  +id: string,
  +localID: string | void,
  +thread: string,
  +user: string,
  +type: number,
  +futureType: number | void,
  +content: string | void,
  +time: bigint,
};

export type Media = {
  +id: string,
  +container: string,
  +thread: string,
  +uri: string,
  +type: 'photo' | 'video',
  +extras: string,
};

export type OlmPersistSession = {
  +targetDeviceID: string,
  +sessionData: string,
  +version: number,
};

export type RawMessageEntity = {
  +message: WebMessage,
  +medias: EmscriptenVector<Media>,
};

declare export class SQLiteQueryExecutor {
  constructor(sqliteFilePath: string, skipMigration: boolean): void;

  migrate(): void;

  updateDraft(key: string, text: string): void;
  moveDraft(oldKey: string, newKey: string): boolean;
  getAllDrafts(): EmscriptenVector<ClientDBDraftInfo>;
  removeAllDrafts(): void;
  removeDrafts(ids: EmscriptenVector<string>): void;

  getInitialMessages(): EmscriptenVector<RawMessageEntity>;
  fetchMessages(
    threadID: string,
    limit: number,
    offset: number,
  ): EmscriptenVector<RawMessageEntity>;
  removeAllMessages(): void;
  removeMessages(ids: EmscriptenVector<string>): void;
  removeMessagesForThreads(threadIDs: EmscriptenVector<string>): void;
  replaceMessage(message: WebMessage, backupItem: boolean): void;
  rekeyMessage(from: string, to: string): void;
  removeAllMedia(): void;
  removeMediaForThreads(threadIDs: EmscriptenVector<string>): void;
  removeMediaForMessages(msgIDs: EmscriptenVector<string>): void;
  removeMediaForMessage(msgID: string): void;
  replaceMedia(media: Media, backupItem: boolean): void;
  rekeyMediaContainers(from: string, to: string): void;

  replaceMessageStoreThreads(
    threads: EmscriptenVector<WebClientDBMessageStoreThread>,
    backupItem: boolean,
  ): void;
  removeMessageStoreThreads(EmscriptenVector<string>): void;
  getAllMessageStoreThreads(): EmscriptenVector<WebClientDBMessageStoreThread>;
  removeAllMessageStoreThreads(): void;

  setMetadata(entryName: string, data: string): void;
  clearMetadata(entryName: string): void;
  getMetadata(entryName: string): string;

  replaceReport(report: ClientDBReport): void;
  removeReports(ids: EmscriptenVector<string>): void;
  removeAllReports(): void;
  getAllReports(): EmscriptenVector<ClientDBReport>;

  setPersistStorageItem(key: string, item: string): void;
  removePersistStorageItem(key: string): void;
  getPersistStorageItem(key: string): string;

  replaceUser(userInfo: ClientDBUserInfo): void;
  removeUsers(ids: EmscriptenVector<string>): void;
  removeAllUsers(): void;
  getAllUsers(): EmscriptenVector<ClientDBUserInfo>;

  replaceThread(thread: WebClientDBThreadInfo, backupItem: boolean): void;
  removeThreads(ids: EmscriptenVector<string>): void;
  removeAllThreads(): void;
  getAllThreads(): EmscriptenVector<WebClientDBThreadInfo>;

  replaceKeyserver(keyserverInfo: ClientDBKeyserverInfo): void;
  removeKeyservers(ids: EmscriptenVector<string>): void;
  removeAllKeyservers(): void;
  getAllKeyservers(): EmscriptenVector<ClientDBKeyserverInfo>;

  replaceCommunity(communityInfo: ClientDBCommunityInfo): void;
  removeCommunities(ids: EmscriptenVector<string>): void;
  removeAllCommunities(): void;
  getAllCommunities(): EmscriptenVector<ClientDBCommunityInfo>;

  replaceIntegrityThreadHashes(
    threadHashes: EmscriptenVector<ClientDBIntegrityThreadHash>,
  ): void;
  removeIntegrityThreadHashes(ids: EmscriptenVector<string>): void;
  removeAllIntegrityThreadHashes(): void;
  getAllIntegrityThreadHashes(): EmscriptenVector<ClientDBIntegrityThreadHash>;

  replaceSyncedMetadataEntry(
    syncedMetadataEntry: ClientDBSyncedMetadataEntry,
  ): void;
  removeSyncedMetadata(names: EmscriptenVector<string>): void;
  removeAllSyncedMetadata(): void;
  getAllSyncedMetadata(): EmscriptenVector<ClientDBSyncedMetadataEntry>;
  replaceAuxUserInfo(auxUserInfo: ClientDBAuxUserInfo): void;
  removeAuxUserInfos(ids: EmscriptenVector<string>): void;
  removeAllAuxUserInfos(): void;
  getAllAuxUserInfos(): EmscriptenVector<ClientDBAuxUserInfo>;
  getSingleAuxUserInfo(userID: string): ?ClientDBAuxUserInfo;

  replaceThreadActivityEntry(
    threadActivityEntry: ClientDBThreadActivityEntry,
    backupItem: boolean,
  ): void;
  removeThreadActivityEntries(ids: EmscriptenVector<string>): void;
  removeAllThreadActivityEntries(): void;
  getAllThreadActivityEntries(): EmscriptenVector<ClientDBThreadActivityEntry>;

  replaceEntry(entryInfo: ClientDBEntryInfo, backupItem: boolean): void;
  removeEntries(ids: EmscriptenVector<string>): void;
  removeAllEntries(): void;
  getAllEntries(): EmscriptenVector<ClientDBEntryInfo>;

  replaceMessageStoreLocalMessageInfo(
    localMessageInfo: ClientDBLocalMessageInfo,
    backupItem: boolean,
  ): void;
  removeMessageStoreLocalMessageInfos(ids: EmscriptenVector<string>): void;
  removeAllMessageStoreLocalMessageInfos(): void;
  getAllMessageStoreLocalMessageInfos(): EmscriptenVector<ClientDBLocalMessageInfo>;

  replaceDMOperation(operation: ClientDBDMOperation): void;
  removeAllDMOperations(): void;
  removeDMOperations(ids: EmscriptenVector<string>): void;
  getAllDMOperations(): EmscriptenVector<ClientDBDMOperation>;
  getDMOperationsByType(type: string): EmscriptenVector<ClientDBDMOperation>;

  beginTransaction(): void;
  commitTransaction(): void;
  rollbackTransaction(): void;

  getContentAccountID(): number;
  getNotifsAccountID(): number;
  getOlmPersistAccountData(accountID: number): ?string;
  getOlmPersistSessionsData(): EmscriptenVector<OlmPersistSession>;
  storeOlmPersistAccount(accountID: number, accountData: string): void;
  storeOlmPersistSession(session: OlmPersistSession): void;

  restoreFromBackupLog(backupLog: EmscriptenVector<number>): void;

  copyContentFromDatabase(
    databasePath: string,
    encryptionKey?: string | void,
  ): void;

  addOutboundP2PMessages(messages: EmscriptenVector<OutboundP2PMessage>): void;
  removeOutboundP2PMessage(confirmedMessageID: string, deviceID: string): void;
  removeAllOutboundP2PMessages(deviceID: string): void;
  getOutboundP2PMessagesByID(
    ids: EmscriptenVector<string>,
  ): EmscriptenVector<OutboundP2PMessage>;
  getUnsentOutboundP2PMessages(): EmscriptenVector<OutboundP2PMessage>;
  setCiphertextForOutboundP2PMessage(
    messageID: string,
    deviceID: string,
    ciphertext: string,
  ): void;
  markOutboundP2PMessageAsSent(messageID: string, deviceID: string): void;
  resetOutboundP2PMessagesForDevice(
    deviceID: string,
    newDeviceID?: string | void,
  ): EmscriptenVector<string>;

  addInboundP2PMessage(message: InboundP2PMessage): void;
  getAllInboundP2PMessage(): EmscriptenVector<InboundP2PMessage>;
  removeInboundP2PMessages(ids: EmscriptenVector<string>): void;
  getInboundP2PMessagesByID(
    ids: EmscriptenVector<string>,
  ): EmscriptenVector<InboundP2PMessage>;

  getRelatedMessages(id: string): EmscriptenVector<RawMessageEntity>;

  updateMessageSearchIndex(
    originalMessageID: string,
    messageID: string,
    content: string,
  ): void;
  deleteMessageFromSearchIndex(messageID: string): void;
  searchMessages(
    query: string,
    threadID: string,
    timestampCursor?: string | void,
    messageIDCursor?: string | void,
  ): EmscriptenVector<RawMessageEntity>;

  getDatabaseVersion(): number;
  getSyncedMetadata(entryName: string): ?string;

  replaceHolder(holder: ClientDBHolderItem): void;
  removeHolders(hashes: EmscriptenVector<string>): void;
  getHolders(): EmscriptenVector<ClientDBHolderItem>;

  addQueuedDMOperation(operation: ClientDBQueuedDMOperation): void;
  removeQueuedDMOperationsOlderThan(timestamp: string): void;
  clearQueuedDMOperations(queueType: string, queueKey: string): void;
  getQueuedDMOperations(): EmscriptenVector<ClientDBQueuedDMOperation>;

  removeLocalMessageInfos(includeNonLocalMessages: boolean): void;

  // method is provided to manually signal that a C++ object
  // is no longer needed and can be deleted
  delete(): void;
}

export type SQLiteQueryExecutorType = typeof SQLiteQueryExecutor;
