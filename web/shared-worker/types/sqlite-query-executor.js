// @flow

import type { ClientDBAuxUserInfo } from 'lib/ops/aux-user-store-ops.js';
import type { ClientDBCommunityInfo } from 'lib/ops/community-store-ops.js';
import type { ClientDBIntegrityThreadHash } from 'lib/ops/integrity-store-ops.js';
import type { ClientDBKeyserverInfo } from 'lib/ops/keyserver-store-ops.js';
import type { ClientDBReport } from 'lib/ops/report-store-ops.js';
import type { ClientDBSyncedMetadataEntry } from 'lib/ops/synced-metadata-store-ops.js';
import type { ClientDBUserInfo } from 'lib/ops/user-store-ops.js';
import type { ClientDBDraftInfo } from 'lib/types/draft-types.js';

import {
  type WebClientDBThreadInfo,
  type NullableString,
  type NullableInt,
} from './entities.js';

type WebMessage = {
  +id: string,
  +localID: NullableString,
  +thread: string,
  +user: string,
  +type: number,
  +futureType: NullableInt,
  +content: NullableString,
  +time: string,
};

type Media = {
  +id: string,
  +container: string,
  +thread: string,
  +uri: string,
  +type: 'photo' | 'video',
  +extras: string,
};

export type OlmPersistSession = {
  +targetUserID: string,
  +sessionData: string,
};

export type ClientMessageToDevice = {
  +messageID: string,
  +deviceID: string,
  +userID: string,
  +timestamp: string,
  +plaintext: string,
  +ciphertext: string,
};

declare export class SQLiteQueryExecutor {
  constructor(sqliteFilePath: string): void;

  updateDraft(key: string, text: string): void;
  moveDraft(oldKey: string, newKey: string): boolean;
  getAllDrafts(): ClientDBDraftInfo[];
  removeAllDrafts(): void;
  removeDrafts(ids: $ReadOnlyArray<string>): void;

  getAllMessagesWeb(): $ReadOnlyArray<{
    +message: WebMessage,
    +medias: $ReadOnlyArray<Media>,
  }>;
  removeAllMessages(): void;
  removeMessages(ids: $ReadOnlyArray<string>): void;
  removeMessagesForThreads(threadIDs: $ReadOnlyArray<string>): void;
  replaceMessageWeb(message: WebMessage): void;
  rekeyMessage(from: string, to: string): void;
  removeAllMedia(): void;
  removeMediaForThreads(threadIDs: $ReadOnlyArray<string>): void;
  removeMediaForMessages(msgIDs: $ReadOnlyArray<string>): void;
  removeMediaForMessage(msgID: string): void;
  replaceMedia(media: Media): void;
  rekeyMediaContainers(from: string, to: string): void;

  replaceMessageStoreThreads(
    threads: $ReadOnlyArray<{ +id: string, +startReached: number }>,
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

  replaceThreadWeb(thread: WebClientDBThreadInfo): void;
  removeThreads(ids: $ReadOnlyArray<string>): void;
  removeAllThreads(): void;
  getAllThreadsWeb(): WebClientDBThreadInfo[];

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

  beginTransaction(): void;
  commitTransaction(): void;
  rollbackTransaction(): void;

  getContentAccountID(): number;
  getNotifsAccountID(): number;
  getOlmPersistAccountDataWeb(accountID: number): NullableString;
  getOlmPersistSessionsData(): $ReadOnlyArray<OlmPersistSession>;
  storeOlmPersistAccount(accountID: number, accountData: string): void;
  storeOlmPersistSession(session: OlmPersistSession): void;

  restoreFromMainCompaction(
    mainCompactionPath: string,
    mainCompactionEncryptionKey: string,
  ): void;

  restoreFromBackupLog(backupLog: Uint8Array): void;

  addMessagesToDevice(messages: $ReadOnlyArray<ClientMessageToDevice>): void;
  removeMessagesToDeviceOlderThan(
    lastConfirmedMessage: ClientMessageToDevice,
  ): void;
  removeAllMessagesForDevice(deviceID: string): void;
  getAllMessagesToDevice(
    deviceID: string,
  ): $ReadOnlyArray<ClientMessageToDevice>;

  // method is provided to manually signal that a C++ object
  // is no longer needed and can be deleted
  delete(): void;
}

export type SQLiteQueryExecutorType = typeof SQLiteQueryExecutor;
