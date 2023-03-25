// @flow

export const SQLITE_CONTENT = 'sqliteFileContent';
export const SQLITE_ENCRYPTION_KEY = 'encryptionKey';

export const CURRENT_USER_ID_KEY = 'current_user_id';

export const DB_PERSIST_THROTTLE_WAIT_MS = 300;

export const DATABASE_WORKER_PATH = '/worker/database';
export const SQLJS_FILE_PATH = '/compiled/webworkers';

export const DB_SUPPORTED_OS: $ReadOnlyArray<string> = [
  'Windows 10',
  'Linux',
  'Mac OS',
];

export const DB_SUPPORTED_BROWSERS: $ReadOnlyArray<string> = [
  'edge',
  'edge-chromium',
  'chrome',
  'safari',
  'firefox',
  'opera',
];
