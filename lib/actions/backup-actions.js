// @flow

import type { LocalLatestBackupInfo } from '../types/backup-types.js';

const createUserKeysBackupActionTypes = Object.freeze({
  started: 'CREATE_USER_KEYS_BACKUP_STARTED',
  success: 'CREATE_USER_KEYS_BACKUP_SUCCESS',
  failed: 'CREATE_USER_KEYS_BACKUP_FAILED',
});

const createUserDataBackupActionTypes = Object.freeze({
  started: 'CREATE_USER_DATA_BACKUP_STARTED',
  success: 'CREATE_USER_DATA_BACKUP_SUCCESS',
  failed: 'CREATE_USER_DATA_BACKUP_FAILED',
});

export type CreateUserDataBackupPayload = {
  +latestBackupInfo: LocalLatestBackupInfo,
  +latestDatabaseVersion: number,
};

export { createUserKeysBackupActionTypes, createUserDataBackupActionTypes };
