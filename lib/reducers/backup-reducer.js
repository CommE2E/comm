// @flow

import { createUserKeysBackupActionTypes } from '../actions/backup-actions.js';
import type { BackupStore } from '../types/backup-types.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceBackupStore(
  store: BackupStore,
  action: BaseAction,
): BackupStore {
  if (action.type === createUserKeysBackupActionTypes.success) {
    const backupID = action.payload;
    return {
      latestBackupInfo: {
        backupID,
        timestamp: Date.now(),
      },
    };
  }
  return store;
}

export { reduceBackupStore };
