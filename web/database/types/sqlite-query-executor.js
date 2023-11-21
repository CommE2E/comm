// @flow

import type { ClientDBReport } from 'lib/ops/report-store-ops.js';
import type { ClientDBUserInfo } from 'lib/ops/user-store-ops.js';
import type { ClientDBDraftInfo } from 'lib/types/draft-types.js';

import { type WebClientDBThreadInfo } from './entities.js';

declare export class SQLiteQueryExecutor {
  constructor(sqliteFilePath: string): void;

  updateDraft(key: string, text: string): void;
  moveDraft(oldKey: string, newKey: string): boolean;
  getAllDrafts(): ClientDBDraftInfo[];
  removeAllDrafts(): void;

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

  // method is provided to manually signal that a C++ object
  // is no longer needed and can be deleted
  delete(): void;
}

export type SQLiteQueryExecutorType = typeof SQLiteQueryExecutor;
