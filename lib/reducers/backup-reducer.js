// @flow

import {
  createUserDataBackupActionTypes,
  createUserKeysBackupActionTypes,
} from '../actions/backup-actions.js';
import { changeIdentityUserPasswordActionTypes } from '../actions/user-actions.js';
import type { BackupStore } from '../types/backup-types.js';
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

export { reduceBackupStore };
