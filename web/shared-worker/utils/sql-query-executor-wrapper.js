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

import {
  vectorToArray,
  arrayToStringVector,
  arrayToIntegrityThreadHashVector,
  arrayToOutboundP2PMessageVector,
  arrayToMessageStoreThreadVector,
} from './vector-utils.js';
import type { WebClientDBThreadInfo } from '../types/entities.js';
import type { EmscriptenModule } from '../types/module.js';
import type {
  SQLiteQueryExecutor,
  WebMessage,
  Media,
  OlmPersistSession,
} from '../types/sqlite-query-executor.js';

export type MessageEntity = {
  +message: WebMessage,
  +medias: $ReadOnlyArray<Media>,
};

/**
 * Wrapper class that automatically handles vector conversions for
 * SQLiteQueryExecutor. This ensures that all methods return proper JavaScript
 * arrays as per the type definitions
 */
class SQLiteQueryExecutorWrapper {
  +rawExecutor: SQLiteQueryExecutor;
  +dbModule: EmscriptenModule;

  constructor(rawExecutor: SQLiteQueryExecutor, dbModule: EmscriptenModule) {
    this.rawExecutor = rawExecutor;
    this.dbModule = dbModule;
  }

  // Migration and constructor operations
  migrate(): void {
    this.rawExecutor.migrate();
  }

  // Draft operations
  updateDraft(key: string, text: string): void {
    this.rawExecutor.updateDraft(key, text);
  }

  moveDraft(oldKey: string, newKey: string): boolean {
    return this.rawExecutor.moveDraft(oldKey, newKey);
  }

  getAllDrafts(): ClientDBDraftInfo[] {
    const vectorResult = this.rawExecutor.getAllDrafts();
    return vectorToArray(vectorResult);
  }

  removeAllDrafts(): void {
    this.rawExecutor.removeAllDrafts();
  }

  removeDrafts(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeDrafts(vectorIds);
  }

  // Message operations
  getInitialMessages(): $ReadOnlyArray<MessageEntity> {
    const vectorResult = this.rawExecutor.getInitialMessages();
    const messagesArray = vectorToArray(vectorResult);

    // Convert nested medias vectors to arrays
    return messagesArray.map(messageEntity => ({
      ...messageEntity,
      medias: vectorToArray(messageEntity.medias),
    }));
  }

  fetchMessages(
    threadID: string,
    limit: number,
    offset: number,
  ): $ReadOnlyArray<MessageEntity> {
    const vectorResult = this.rawExecutor.fetchMessages(
      threadID,
      limit,
      offset,
    );
    const messagesArray = vectorToArray(vectorResult);

    // Convert nested medias vectors to arrays
    return messagesArray.map(messageEntity => ({
      ...messageEntity,
      medias: vectorToArray(messageEntity.medias),
    }));
  }

  removeAllMessages(): void {
    this.rawExecutor.removeAllMessages();
  }

  removeMessages(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeMessages(vectorIds);
  }

  removeMessagesForThreads(threadIDs: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(threadIDs, this.dbModule);
    this.rawExecutor.removeMessagesForThreads(vectorIds);
  }

  replaceMessage(message: WebMessage, backupItem: boolean): void {
    this.rawExecutor.replaceMessage(message, backupItem);
  }

  rekeyMessage(from: string, to: string): void {
    this.rawExecutor.rekeyMessage(from, to);
  }

  // Media operations
  removeAllMedia(): void {
    this.rawExecutor.removeAllMedia();
  }

  removeMediaForThreads(threadIDs: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(threadIDs, this.dbModule);
    this.rawExecutor.removeMediaForThreads(vectorIds);
  }

  removeMediaForMessages(msgIDs: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(msgIDs, this.dbModule);
    this.rawExecutor.removeMediaForMessages(vectorIds);
  }

  removeMediaForMessage(msgID: string): void {
    this.rawExecutor.removeMediaForMessage(msgID);
  }

  replaceMedia(media: Media, backupItem: boolean): void {
    this.rawExecutor.replaceMedia(media, backupItem);
  }

  rekeyMediaContainers(from: string, to: string): void {
    this.rawExecutor.rekeyMediaContainers(from, to);
  }

  // Message store thread operations
  replaceMessageStoreThreads(
    threads: $ReadOnlyArray<WebClientDBMessageStoreThread>,
    backupItem: boolean,
  ): void {
    const vectorThreads = arrayToMessageStoreThreadVector(
      threads,
      this.dbModule,
    );
    this.rawExecutor.replaceMessageStoreThreads(vectorThreads, backupItem);
  }

  removeMessageStoreThreads(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeMessageStoreThreads(vectorIds);
  }

  getAllMessageStoreThreads(): $ReadOnlyArray<WebClientDBMessageStoreThread> {
    const vectorResult = this.rawExecutor.getAllMessageStoreThreads();
    return vectorToArray(vectorResult);
  }

  removeAllMessageStoreThreads(): void {
    this.rawExecutor.removeAllMessageStoreThreads();
  }

  // Metadata operations
  setMetadata(entryName: string, data: string): void {
    this.rawExecutor.setMetadata(entryName, data);
  }

  clearMetadata(entryName: string): void {
    this.rawExecutor.clearMetadata(entryName);
  }

  getMetadata(entryName: string): string {
    return this.rawExecutor.getMetadata(entryName);
  }

  // Report operations
  replaceReport(report: ClientDBReport): void {
    this.rawExecutor.replaceReport(report);
  }

  removeReports(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeReports(vectorIds);
  }

  removeAllReports(): void {
    this.rawExecutor.removeAllReports();
  }

  getAllReports(): ClientDBReport[] {
    const vectorResult = this.rawExecutor.getAllReports();
    return vectorToArray(vectorResult);
  }

  // Persist storage operations
  setPersistStorageItem(key: string, item: string): void {
    this.rawExecutor.setPersistStorageItem(key, item);
  }

  removePersistStorageItem(key: string): void {
    this.rawExecutor.removePersistStorageItem(key);
  }

  getPersistStorageItem(key: string): string {
    return this.rawExecutor.getPersistStorageItem(key);
  }

  // User operations
  replaceUser(userInfo: ClientDBUserInfo): void {
    this.rawExecutor.replaceUser(userInfo);
  }

  removeUsers(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeUsers(vectorIds);
  }

  removeAllUsers(): void {
    this.rawExecutor.removeAllUsers();
  }

  getAllUsers(): ClientDBUserInfo[] {
    const vectorResult = this.rawExecutor.getAllUsers();
    return vectorToArray(vectorResult);
  }

  // Thread operations
  replaceThread(thread: WebClientDBThreadInfo, backupItem: boolean): void {
    this.rawExecutor.replaceThread(thread, backupItem);
  }

  removeThreads(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeThreads(vectorIds);
  }

  removeAllThreads(): void {
    this.rawExecutor.removeAllThreads();
  }

  getAllThreads(): WebClientDBThreadInfo[] {
    const vectorResult = this.rawExecutor.getAllThreads();
    return vectorToArray(vectorResult);
  }

  // Keyserver operations
  replaceKeyserver(keyserverInfo: ClientDBKeyserverInfo): void {
    this.rawExecutor.replaceKeyserver(keyserverInfo);
  }

  removeKeyservers(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeKeyservers(vectorIds);
  }

  removeAllKeyservers(): void {
    this.rawExecutor.removeAllKeyservers();
  }

  getAllKeyservers(): ClientDBKeyserverInfo[] {
    const vectorResult = this.rawExecutor.getAllKeyservers();
    return vectorToArray(vectorResult);
  }

  // Community operations
  replaceCommunity(communityInfo: ClientDBCommunityInfo): void {
    this.rawExecutor.replaceCommunity(communityInfo);
  }

  removeCommunities(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeCommunities(vectorIds);
  }

  removeAllCommunities(): void {
    this.rawExecutor.removeAllCommunities();
  }

  getAllCommunities(): ClientDBCommunityInfo[] {
    const vectorResult = this.rawExecutor.getAllCommunities();
    return vectorToArray(vectorResult);
  }

  // Integrity thread hash operations
  replaceIntegrityThreadHashes(
    threadHashes: $ReadOnlyArray<ClientDBIntegrityThreadHash>,
  ): void {
    const vectorThreadHashes = arrayToIntegrityThreadHashVector(
      threadHashes,
      this.dbModule,
    );
    this.rawExecutor.replaceIntegrityThreadHashes(vectorThreadHashes);
  }

  removeIntegrityThreadHashes(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeIntegrityThreadHashes(vectorIds);
  }

  removeAllIntegrityThreadHashes(): void {
    this.rawExecutor.removeAllIntegrityThreadHashes();
  }

  getAllIntegrityThreadHashes(): ClientDBIntegrityThreadHash[] {
    const vectorResult = this.rawExecutor.getAllIntegrityThreadHashes();
    return vectorToArray(vectorResult);
  }

  // Synced metadata operations
  replaceSyncedMetadataEntry(
    syncedMetadataEntry: ClientDBSyncedMetadataEntry,
  ): void {
    this.rawExecutor.replaceSyncedMetadataEntry(syncedMetadataEntry);
  }

  removeSyncedMetadata(names: $ReadOnlyArray<string>): void {
    const vectorNames = arrayToStringVector(names, this.dbModule);
    this.rawExecutor.removeSyncedMetadata(vectorNames);
  }

  removeAllSyncedMetadata(): void {
    this.rawExecutor.removeAllSyncedMetadata();
  }

  getAllSyncedMetadata(): ClientDBSyncedMetadataEntry[] {
    const vectorResult = this.rawExecutor.getAllSyncedMetadata();
    return vectorToArray(vectorResult);
  }

  // Aux user operations
  replaceAuxUserInfo(auxUserInfo: ClientDBAuxUserInfo): void {
    this.rawExecutor.replaceAuxUserInfo(auxUserInfo);
  }

  removeAuxUserInfos(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeAuxUserInfos(vectorIds);
  }

  removeAllAuxUserInfos(): void {
    this.rawExecutor.removeAllAuxUserInfos();
  }

  getAllAuxUserInfos(): ClientDBAuxUserInfo[] {
    const vectorResult = this.rawExecutor.getAllAuxUserInfos();
    return vectorToArray(vectorResult);
  }

  getSingleAuxUserInfo(userID: string): ?ClientDBAuxUserInfo {
    return this.rawExecutor.getSingleAuxUserInfo(userID);
  }

  // Thread activity operations
  replaceThreadActivityEntry(
    threadActivityEntry: ClientDBThreadActivityEntry,
    backupItem: boolean,
  ): void {
    this.rawExecutor.replaceThreadActivityEntry(
      threadActivityEntry,
      backupItem,
    );
  }

  removeThreadActivityEntries(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeThreadActivityEntries(vectorIds);
  }

  removeAllThreadActivityEntries(): void {
    this.rawExecutor.removeAllThreadActivityEntries();
  }

  getAllThreadActivityEntries(): ClientDBThreadActivityEntry[] {
    const vectorResult = this.rawExecutor.getAllThreadActivityEntries();
    return vectorToArray(vectorResult);
  }

  // Entry operations
  replaceEntry(entryInfo: ClientDBEntryInfo, backupItem: boolean): void {
    this.rawExecutor.replaceEntry(entryInfo, backupItem);
  }

  removeEntries(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeEntries(vectorIds);
  }

  removeAllEntries(): void {
    this.rawExecutor.removeAllEntries();
  }

  getAllEntries(): $ReadOnlyArray<ClientDBEntryInfo> {
    const vectorResult = this.rawExecutor.getAllEntries();
    return vectorToArray(vectorResult);
  }

  // Message store local message operations
  replaceMessageStoreLocalMessageInfo(
    localMessageInfo: ClientDBLocalMessageInfo,
    backupItem: boolean,
  ): void {
    this.rawExecutor.replaceMessageStoreLocalMessageInfo(
      localMessageInfo,
      backupItem,
    );
  }

  removeMessageStoreLocalMessageInfos(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeMessageStoreLocalMessageInfos(vectorIds);
  }

  removeAllMessageStoreLocalMessageInfos(): void {
    this.rawExecutor.removeAllMessageStoreLocalMessageInfos();
  }

  getAllMessageStoreLocalMessageInfos(): ClientDBLocalMessageInfo[] {
    const vectorResult = this.rawExecutor.getAllMessageStoreLocalMessageInfos();
    return vectorToArray(vectorResult);
  }

  // DM Operations
  replaceDMOperation(operation: ClientDBDMOperation): void {
    this.rawExecutor.replaceDMOperation(operation);
  }

  removeAllDMOperations(): void {
    this.rawExecutor.removeAllDMOperations();
  }

  removeDMOperations(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeDMOperations(vectorIds);
  }

  getAllDMOperations(): $ReadOnlyArray<ClientDBDMOperation> {
    const vectorResult = this.rawExecutor.getAllDMOperations();
    return vectorToArray(vectorResult);
  }

  getDMOperationsByType(type: string): $ReadOnlyArray<ClientDBDMOperation> {
    const vectorResult = this.rawExecutor.getDMOperationsByType(type);
    return vectorToArray(vectorResult);
  }

  // Transaction operations
  beginTransaction(): void {
    this.rawExecutor.beginTransaction();
  }

  commitTransaction(): void {
    this.rawExecutor.commitTransaction();
  }

  rollbackTransaction(): void {
    this.rawExecutor.rollbackTransaction();
  }

  // Account operations
  getContentAccountID(): number {
    return this.rawExecutor.getContentAccountID();
  }

  getNotifsAccountID(): number {
    return this.rawExecutor.getNotifsAccountID();
  }

  getOlmPersistAccountData(accountID: number): ?string {
    return this.rawExecutor.getOlmPersistAccountData(accountID);
  }

  getOlmPersistSessionsData(): $ReadOnlyArray<OlmPersistSession> {
    const vectorResult = this.rawExecutor.getOlmPersistSessionsData();
    return vectorToArray(vectorResult);
  }

  storeOlmPersistAccount(accountID: number, accountData: string): void {
    this.rawExecutor.storeOlmPersistAccount(accountID, accountData);
  }

  storeOlmPersistSession(session: OlmPersistSession): void {
    this.rawExecutor.storeOlmPersistSession(session);
  }

  // Database operations
  restoreFromBackupLog(backupLog: Uint8Array): void {
    this.rawExecutor.restoreFromBackupLog(backupLog);
  }

  copyContentFromDatabase(
    databasePath: string,
    encryptionKey?: string | void,
  ): void {
    this.rawExecutor.copyContentFromDatabase(databasePath, encryptionKey);
  }

  // P2P message operations
  addOutboundP2PMessages(messages: $ReadOnlyArray<OutboundP2PMessage>): void {
    const vectorMessages = arrayToOutboundP2PMessageVector(
      messages,
      this.dbModule,
    );
    this.rawExecutor.addOutboundP2PMessages(vectorMessages);
  }

  removeOutboundP2PMessage(confirmedMessageID: string, deviceID: string): void {
    this.rawExecutor.removeOutboundP2PMessage(confirmedMessageID, deviceID);
  }

  removeAllOutboundP2PMessages(deviceID: string): void {
    this.rawExecutor.removeAllOutboundP2PMessages(deviceID);
  }

  getOutboundP2PMessagesByID(
    ids: $ReadOnlyArray<string>,
  ): $ReadOnlyArray<OutboundP2PMessage> {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    const vectorResult = this.rawExecutor.getOutboundP2PMessagesByID(vectorIds);
    return vectorToArray(vectorResult);
  }

  getUnsentOutboundP2PMessages(): $ReadOnlyArray<OutboundP2PMessage> {
    const vectorResult = this.rawExecutor.getUnsentOutboundP2PMessages();
    return vectorToArray(vectorResult);
  }

  setCiphertextForOutboundP2PMessage(
    messageID: string,
    deviceID: string,
    ciphertext: string,
  ): void {
    this.rawExecutor.setCiphertextForOutboundP2PMessage(
      messageID,
      deviceID,
      ciphertext,
    );
  }

  markOutboundP2PMessageAsSent(messageID: string, deviceID: string): void {
    this.rawExecutor.markOutboundP2PMessageAsSent(messageID, deviceID);
  }

  resetOutboundP2PMessagesForDevice(
    deviceID: string,
    newDeviceID?: string | void,
  ): $ReadOnlyArray<string> {
    const vectorResult = this.rawExecutor.resetOutboundP2PMessagesForDevice(
      deviceID,
      newDeviceID,
    );
    return vectorToArray(vectorResult);
  }

  addInboundP2PMessage(message: InboundP2PMessage): void {
    this.rawExecutor.addInboundP2PMessage(message);
  }

  getAllInboundP2PMessage(): $ReadOnlyArray<InboundP2PMessage> {
    const vectorResult = this.rawExecutor.getAllInboundP2PMessage();
    return vectorToArray(vectorResult);
  }

  removeInboundP2PMessages(ids: $ReadOnlyArray<string>): void {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    this.rawExecutor.removeInboundP2PMessages(vectorIds);
  }

  getInboundP2PMessagesByID(
    ids: $ReadOnlyArray<string>,
  ): $ReadOnlyArray<InboundP2PMessage> {
    const vectorIds = arrayToStringVector(ids, this.dbModule);
    const vectorResult = this.rawExecutor.getInboundP2PMessagesByID(vectorIds);
    return vectorToArray(vectorResult);
  }

  // Related messages
  getRelatedMessages(id: string): $ReadOnlyArray<MessageEntity> {
    const vectorResult = this.rawExecutor.getRelatedMessages(id);
    const messagesArray = vectorToArray(vectorResult);

    // Convert nested medias vectors to arrays
    return messagesArray.map(messageEntity => ({
      ...messageEntity,
      medias: vectorToArray(messageEntity.medias),
    }));
  }

  // Message search operations
  updateMessageSearchIndex(
    originalMessageID: string,
    messageID: string,
    content: string,
  ): void {
    this.rawExecutor.updateMessageSearchIndex(
      originalMessageID,
      messageID,
      content,
    );
  }

  deleteMessageFromSearchIndex(messageID: string): void {
    this.rawExecutor.deleteMessageFromSearchIndex(messageID);
  }

  searchMessages(
    query: string,
    threadID: string,
    timestampCursor?: string | void,
    messageIDCursor?: string | void,
  ): $ReadOnlyArray<MessageEntity> {
    const vectorResult = this.rawExecutor.searchMessages(
      query,
      threadID,
      timestampCursor,
      messageIDCursor,
    );
    const messagesArray = vectorToArray(vectorResult);

    // Convert nested medias vectors to arrays
    return messagesArray.map(messageEntity => ({
      ...messageEntity,
      medias: vectorToArray(messageEntity.medias),
    }));
  }

  // Database version
  getDatabaseVersion(): number {
    return this.rawExecutor.getDatabaseVersion();
  }

  getSyncedMetadata(entryName: string): ?string {
    return this.rawExecutor.getSyncedMetadata(entryName);
  }

  // Holder operations
  replaceHolder(holder: ClientDBHolderItem): void {
    this.rawExecutor.replaceHolder(holder);
  }

  removeHolders(hashes: $ReadOnlyArray<string>): void {
    const vectorHashes = arrayToStringVector(hashes, this.dbModule);
    this.rawExecutor.removeHolders(vectorHashes);
  }

  getHolders(): $ReadOnlyArray<ClientDBHolderItem> {
    const vectorResult = this.rawExecutor.getHolders();
    return vectorToArray(vectorResult);
  }

  // Queued DM operations
  addQueuedDMOperation(operation: ClientDBQueuedDMOperation): void {
    this.rawExecutor.addQueuedDMOperation(operation);
  }

  removeQueuedDMOperationsOlderThan(timestamp: string): void {
    this.rawExecutor.removeQueuedDMOperationsOlderThan(timestamp);
  }

  clearQueuedDMOperations(queueType: string, queueKey: string): void {
    this.rawExecutor.clearQueuedDMOperations(queueType, queueKey);
  }

  getQueuedDMOperations(): $ReadOnlyArray<ClientDBQueuedDMOperation> {
    const vectorResult = this.rawExecutor.getQueuedDMOperations();
    return vectorToArray(vectorResult);
  }

  removeLocalMessageInfos(includeNonLocalMessages: boolean): void {
    this.rawExecutor.removeLocalMessageInfos(includeNonLocalMessages);
  }

  // Cleanup
  delete(): void {
    this.rawExecutor.delete();
  }
}

export { SQLiteQueryExecutorWrapper };
