// @flow

import localforage from 'localforage';

export const SQLITE_CONTENT = 'sqliteFileContent';
export const SQLITE_ENCRYPTION_KEY = 'encryptionKey';

export const CURRENT_USER_ID_KEY = 'current_user_id';

export const DATABASE_WORKER_PATH = '/worker/database';
export const DATABASE_MODULE_FILE_PATH = '/compiled/webworkers';

export const DEFAULT_COMM_QUERY_EXECUTOR_FILENAME = 'comm_query_executor.wasm';

export const COMM_SQLITE_DATABASE_PATH = 'comm.sqlite';

export const DB_SUPPORTED_OS: $ReadOnlyArray<string> = [
  'Windows 10',
  'Linux',
  'Mac OS',
];

export const DB_SUPPORTED_BROWSERS: $ReadOnlyArray<string> = [
  'edge',
  'edge-chromium',
  'chrome',
  'firefox',
  'opera',
  'safari',
];

export const localforageConfig: PartialConfig = {
  driver: localforage.INDEXEDDB,
  name: 'comm',
  storeName: 'commStorage',
  description: 'Comm encrypted database storage',
  version: '1.0',
};
