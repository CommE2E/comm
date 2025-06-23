// @flow

import invariant from 'invariant';

import {
  createUserDataBackupActionTypes,
  createUserKeysBackupActionTypes,
} from '../actions/backup-actions.js';
import { changeIdentityUserPasswordActionTypes } from '../actions/user-actions.js';
import type { BackupStore, RestoreBackupState } from '../types/backup-types.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceBackupStore(
  store: BackupStore,
  action: BaseAction,
): BackupStore {
  if (action.type === createUserKeysBackupActionTypes.success) {
    const latestBackupInfo = action.payload;
    return {
      ...store,
      latestBackupInfo,
    };
  } else if (action.type === createUserDataBackupActionTypes.success) {
    const { latestBackupInfo, latestDatabaseVersion } = action.payload;
    return {
      ...store,
      latestBackupInfo,
      latestDatabaseVersion,
    };
  } else if (action.type === changeIdentityUserPasswordActionTypes.success) {
    return {
      ...store,
      latestBackupInfo: null,
    };
  }
  return store;
}

function reduceRestoreBackupState(
  store: RestoreBackupState,
  action: BaseAction,
): RestoreBackupState {
  if (action.type === createUserKeysBackupActionTypes.started) {
    return { ...store, status: 'user_keys_backup_started', payload: {} };
  } else if (action.type === createUserKeysBackupActionTypes.success) {
    invariant(
      store.status === 'user_keys_backup_started' ||
        store.status === 'no_backup',
      'UserKeys backup success dispatched but no backup was in progress',
    );
    return { ...store, status: 'user_keys_backup_success', payload: {} };
  } else if (action.type === createUserKeysBackupActionTypes.failed) {
    invariant(
      store.status === 'user_keys_backup_started',
      'UserKeys backup failure dispatched but no backup was in progress',
    );
    return { ...store, status: 'user_keys_backup_failed', payload: {} };
  } else if (action.type === createUserDataBackupActionTypes.started) {
    return { ...store, status: 'user_data_backup_started', payload: {} };
  } else if (action.type === createUserDataBackupActionTypes.success) {
    invariant(
      store.status === 'user_data_backup_started',
      'UserData backup success dispatched but no backup was in progress',
    );
    return { ...store, status: 'user_data_backup_success' };
  } else if (action.type === createUserDataBackupActionTypes.failed) {
    invariant(
      store.status === 'user_data_backup_started',
      'UserData backup failure dispatched but no backup was in progress',
    );
    return { ...store, status: 'user_data_backup_failed' };
  }

  return store;
}

export { reduceBackupStore, reduceRestoreBackupState };
