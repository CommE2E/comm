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

const restoreUserDataStepActionTypes = Object.freeze({
  started: 'RESTORE_USER_DATA_STEP_STARTED',
  success: 'RESTORE_USER_DATA_STEP_SUCCESS',
  failed: 'RESTORE_USER_DATA_STEP_FAILED',
});

const resetBackupRestoreStateActionType = 'RESET_BACKUP_RESTOTE_STATE';
const markBackupAsRestoredActionType = 'MARK_BACKUP_AS_RESTORED';

const sendBackupDataToSecondaryActionTypes = Object.freeze({
  started: 'SEND_BACKUP_DATA_TO_SECONDARY_STARTED',
  success: 'SEND_BACKUP_DATA_TO_SECONDARY_SUCCESS',
  failed: 'SEND_BACKUP_DATA_TO_SECONDARY_FAILED',
});

export {
  createUserKeysBackupActionTypes,
  createUserDataBackupActionTypes,
  restoreUserDataStepActionTypes,
  resetBackupRestoreStateActionType,
  markBackupAsRestoredActionType,
  sendBackupDataToSecondaryActionTypes,
};
