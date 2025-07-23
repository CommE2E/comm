// @flow

import type { ClientDBAuxUserInfo } from 'lib/ops/aux-user-store-ops.js';
import type { ClientDBCommunityInfo } from 'lib/ops/community-store-ops.js';
import type { ClientDBDMOperation } from 'lib/ops/dm-operations-store-ops.js';
import type { ClientDBEntryInfo } from 'lib/ops/entries-store-ops.js';
import type { ClientDBIntegrityThreadHash } from 'lib/ops/integrity-store-ops.js';
import type { ClientDBKeyserverInfo } from 'lib/ops/keyserver-store-ops.js';
import type { ClientDBReport } from 'lib/ops/report-store-ops.js';
import type { ClientDBSyncedMetadataEntry } from 'lib/ops/synced-metadata-store-ops.js';
import type { ClientDBThreadActivityEntry } from 'lib/ops/thread-activity-store-ops.js';
import type { ClientDBUserInfo } from 'lib/ops/user-store-ops.js';
import type { ClientDBDraftInfo } from 'lib/types/draft-types.js';
import type { ClientDBHolderItem } from 'lib/types/holder-types.js';
import type { ClientDBLocalMessageInfo } from 'lib/types/message-types.js';
import type {
  OutboundP2PMessage,
  InboundP2PMessage,
} from 'lib/types/sqlite-types.js';

import { type WebClientDBThreadInfo } from './entities.js';

export type WebMessage = {
  +id: string,
  +localID: ?string,
  +thread: string,
  +user: string,
  +type: number,
  +futureType: ?number,
  +content: ?string,
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

export type MessageEntity = {
  +message: WebMessage,
  +medias: $ReadOnlyArray<Media>,
};

export type ClientDBQueuedDMOperation = {
  +queue_type: string,
  +queue_key: string,
  +operation_data: string,
  +timestamp: string,
};

declare export class SQLiteQueryExecutor {
  constructor(sqliteFilePath: string, skipMigration: boolean): void;

  migrate(): void;

  updateDraft(key: string, text: string): void;
  moveDraft(oldKey: string, newKey: string): boolean;
  getAllDrafts(): ClientDBDraftInfo[];
  removeAllDrafts(): void;
  removeDrafts(ids: $ReadOnlyArray<string>): void;

  getInitialMessages(): $ReadOnlyArray<MessageEntity>;
  fetchMessages(
    threadID: string,
    limit: number,
    offset: number,
  ): $ReadOnlyArray<MessageEntity>;
  removeAllMessages(): void;
  removeMessages(ids: $ReadOnlyArray<string>): void;
  removeMessagesForThreads(threadIDs: $ReadOnlyArray<string>): void;
  replaceMessage(message: WebMessage, backupItem: boolean): void;
  rekeyMessage(from: string, to: string): void;
  removeAllMedia(): void;
  removeMediaForThreads(threadIDs: $ReadOnlyArray<string>): void;
  removeMediaForMessages(msgIDs: $ReadOnlyArray<string>): void;
  removeMediaForMessage(msgID: string): void;
  replaceMedia(media: Media, backupItem: boolean): void;
  rekeyMediaContainers(from: string, to: string): void;

  replaceMessageStoreThreads(
    threads: $ReadOnlyArray<{ +id: string, +startReached: number }>,
    backupItem: boolean,
  ): void;
  removeMessageStoreThreads($ReadOnlyArray<string>): void;
  getAllMessageStoreThreads(): $ReadOnlyArray<{
    +id: string,
    +startReached: number,
  }>;
  removeAllMessageStoreThreads(): void;

  setMetadata(entryName: string, data: string): void;
  clearMetadata(entryName: string): void;
  getMetadata(entryName: string): string;

  replaceReport(report: ClientDBReport): void;
  removeReports(ids: $ReadOnlyArray<string>): void;
  removeAllReports(): void;
  getAllReports(): ClientDBReport[];

  setPersistStorageItem(key: string, item: string): void;
  removePersistStorageItem(key: string): void;
  getPersistStorageItem(key: string): string;

  replaceUser(userInfo: ClientDBUserInfo): void;
  removeUsers(ids: $ReadOnlyArray<string>): void;
  removeAllUsers(): void;
  getAllUsers(): ClientDBUserInfo[];

  replaceThread(thread: WebClientDBThreadInfo, backupItem: boolean): void;
  removeThreads(ids: $ReadOnlyArray<string>): void;
  removeAllThreads(): void;
  getAllThreads(): WebClientDBThreadInfo[];

  replaceKeyserver(keyserverInfo: ClientDBKeyserverInfo): void;
  removeKeyservers(ids: $ReadOnlyArray<string>): void;
  removeAllKeyservers(): void;
  getAllKeyservers(): ClientDBKeyserverInfo[];

  replaceCommunity(communityInfo: ClientDBCommunityInfo): void;
  removeCommunities(ids: $ReadOnlyArray<string>): void;
  removeAllCommunities(): void;
  getAllCommunities(): ClientDBCommunityInfo[];

  replaceIntegrityThreadHashes(
    threadHashes: $ReadOnlyArray<ClientDBIntegrityThreadHash>,
  ): void;
  removeIntegrityThreadHashes(ids: $ReadOnlyArray<string>): void;
  removeAllIntegrityThreadHashes(): void;
  getAllIntegrityThreadHashes(): ClientDBIntegrityThreadHash[];

  replaceSyncedMetadataEntry(
    syncedMetadataEntry: ClientDBSyncedMetadataEntry,
  ): void;
  removeSyncedMetadata(names: $ReadOnlyArray<string>): void;
  removeAllSyncedMetadata(): void;
  getAllSyncedMetadata(): ClientDBSyncedMetadataEntry[];
  replaceAuxUserInfo(auxUserInfo: ClientDBAuxUserInfo): void;
  removeAuxUserInfos(ids: $ReadOnlyArray<string>): void;
  removeAllAuxUserInfos(): void;
  getAllAuxUserInfos(): ClientDBAuxUserInfo[];
  getSingleAuxUserInfo(userID: string): ?ClientDBAuxUserInfo;

  replaceThreadActivityEntry(
    threadActivityEntry: ClientDBThreadActivityEntry,
    backupItem: boolean,
  ): void;
  removeThreadActivityEntries(ids: $ReadOnlyArray<string>): void;
  removeAllThreadActivityEntries(): void;
  getAllThreadActivityEntries(): ClientDBThreadActivityEntry[];

  replaceEntry(entryInfo: ClientDBEntryInfo, backupItem: boolean): void;
  removeEntries(ids: $ReadOnlyArray<string>): void;
  removeAllEntries(): void;
  getAllEntries(): $ReadOnlyArray<ClientDBEntryInfo>;

  replaceMessageStoreLocalMessageInfo(
    localMessageInfo: ClientDBLocalMessageInfo,
    backupItem: boolean,
  ): void;
  removeMessageStoreLocalMessageInfos(ids: $ReadOnlyArray<string>): void;
  removeAllMessageStoreLocalMessageInfos(): void;
  getAllMessageStoreLocalMessageInfos(): ClientDBLocalMessageInfo[];

  replaceDMOperation(operation: ClientDBDMOperation): void;
  removeAllDMOperations(): void;
  removeDMOperations(ids: $ReadOnlyArray<string>): void;
  getAllDMOperations(): $ReadOnlyArray<ClientDBDMOperation>;
  getDMOperationsByType(type: string): $ReadOnlyArray<ClientDBDMOperation>;

  beginTransaction(): void;
  commitTransaction(): void;
  rollbackTransaction(): void;

  getContentAccountID(): number;
  getNotifsAccountID(): number;
  getOlmPersistAccountData(accountID: number): ?string;
  getOlmPersistSessionsData(): $ReadOnlyArray<OlmPersistSession>;
  storeOlmPersistAccount(accountID: number, accountData: string): void;
  storeOlmPersistSession(session: OlmPersistSession): void;

  restoreFromBackupLog(backupLog: Uint8Array): void;

  copyContentFromDatabase(databasePath: string, encryptionKey: ?string): void;

  addOutboundP2PMessages(messages: $ReadOnlyArray<OutboundP2PMessage>): void;
  removeOutboundP2PMessage(confirmedMessageID: string, deviceID: string): void;
  removeAllOutboundP2PMessages(deviceID: string): void;
  getOutboundP2PMessagesByID(
    ids: $ReadOnlyArray<string>,
  ): $ReadOnlyArray<OutboundP2PMessage>;
  getUnsentOutboundP2PMessages(): $ReadOnlyArray<OutboundP2PMessage>;
  setCiphertextForOutboundP2PMessage(
    messageID: string,
    deviceID: string,
    ciphertext: string,
  ): void;
  markOutboundP2PMessageAsSent(messageID: string, deviceID: string): void;
  resetOutboundP2PMessagesForDevice(deviceID: string): $ReadOnlyArray<string>;

  addInboundP2PMessage(message: InboundP2PMessage): void;
  getAllInboundP2PMessage(): $ReadOnlyArray<InboundP2PMessage>;
  removeInboundP2PMessages(ids: $ReadOnlyArray<string>): void;
  getInboundP2PMessagesByID(
    ids: $ReadOnlyArray<string>,
  ): $ReadOnlyArray<InboundP2PMessage>;

  getRelatedMessages(id: string): $ReadOnlyArray<MessageEntity>;

  updateMessageSearchIndex(
    originalMessageID: string,
    messageID: string,
    content: string,
  ): void;
  deleteMessageFromSearchIndex(messageID: string): void;
  searchMessages(
    query: string,
    threadID: string,
    timestampCursor: ?string,
    messageIDCursor: ?string,
  ): $ReadOnlyArray<MessageEntity>;

  getDatabaseVersion(): number;
  getSyncedMetadata(entryName: string): ?string;

  replaceHolder(holder: ClientDBHolderItem): void;
  removeHolders(hashes: $ReadOnlyArray<string>): void;
  getHolders(): $ReadOnlyArray<ClientDBHolderItem>;

  addQueuedDMOperation(operation: ClientDBQueuedDMOperation): void;
  removeQueuedDMOperationsOlderThan(timestamp: string): void;
  clearQueuedDMOperations(queueType: string, queueKey: string): void;
  getQueuedDMOperations(): $ReadOnlyArray<ClientDBQueuedDMOperation>;

  removeLocalMessageInfos(includeNonLocalMessages: boolean): void;

  // method is provided to manually signal that a C++ object
  // is no longer needed and can be deleted
  delete(): void;
}

export type SQLiteQueryExecutorType = typeof SQLiteQueryExecutor;
