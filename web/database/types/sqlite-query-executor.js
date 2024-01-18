// @flow

import type { ClientDBReport } from 'lib/ops/report-store-ops.js';
import type { ClientDBUserInfo } from 'lib/ops/user-store-ops.js';
import type { ClientDBDraftInfo } from 'lib/types/draft-types.js';

import { type WebClientDBThreadInfo, type NullableString } from './entities.js';

type WebMessage = {
  +id: string,
  +local_id: NullableString,
  +thread: string,
  +user: string,
  +content: NullableString,
};

type Media = {
  +id: string,
  +container: string,
  +thread: string,
  +uri: string,
  +type: string,
  +extras: string,
};

type OlmPersistSession = {
  +target_user_id: string,
  +session_data: string,
};

declare export class SQLiteQueryExecutor {
  constructor(sqliteFilePath: string): void;

  updateDraft(key: string, text: string): void;
  moveDraft(oldKey: string, newKey: string): boolean;
  getAllDrafts(): ClientDBDraftInfo[];
  removeAllDrafts(): void;

  getAllMessagesWeb(): $ReadOnlyArray<{
    +message: WebMessage,
    +medias: $ReadOnlyArray<Media>,
  }>;
  removeAllMessages(): void;
  removeMessages(ids: $ReadOnlyArray<string>): void;
  removeMessagesForThreads(thread_ids: $ReadOnlyArray<string>): void;
  replaceMessageWeb(message: WebMessage): void;
  rekeyMessage(from: string, to: string): void;
  removeAllMedia(): void;
  removeMediaForThreads(thread_ids: $ReadOnlyArray<string>): void;
  removeMediaForMessages(msg_ids: $ReadOnlyArray<string>): void;
  removeMediaForMessage(msg_id: string): void;
  replaceMedia(media: Media): void;
  rekeyMediaContainers(from: string, to: string): void;

  replaceMessageStoreThreads(
    threads: $ReadOnlyArray<{ +id: string, +start_reached: number }>,
  ): void;
  removeMessageStoreThreads($ReadOnlyArray<string>): void;
  getAllMessageStoreThreads(): $ReadOnlyArray<{
    +id: string,
    +start_reached: number,
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

  replaceUser(user_info: ClientDBUserInfo): void;
  removeUsers(ids: $ReadOnlyArray<string>): void;
  removeAllUsers(): void;
  getAllUsers(): ClientDBUserInfo[];

  replaceThreadWeb(thread: WebClientDBThreadInfo): void;
  removeThreads(ids: $ReadOnlyArray<string>): void;
  removeAllThreads(): void;
  getAllThreadsWeb(): WebClientDBThreadInfo[];

  beginTransaction(): void;
  commitTransaction(): void;
  rollbackTransaction(): void;

  getOlmPersistAccountDataWeb(): NullableString;
  getOlmPersistSessionsData(): $ReadOnlyArray<OlmPersistSession>;
  storeOlmPersistDataWeb(
    accountData: string,
    sessions: $ReadOnlyArray<OlmPersistSession>,
  ): void;

  restoreFromMainCompaction(
    mainCompactionPath: string,
    mainCompactionEncryptionKey: string,
  ): void;

  // method is provided to manually signal that a C++ object
  // is no longer needed and can be deleted
  delete(): void;
}

export type SQLiteQueryExecutorType = typeof SQLiteQueryExecutor;
