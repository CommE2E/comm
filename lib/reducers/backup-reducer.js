// @flow

import { createUserKeysBackupActionTypes } from '../actions/backup-actions.js';
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
      latestBackupInfo,
    };
  } else if (action.type === changeIdentityUserPasswordActionTypes.success) {
    return {
      latestBackupInfo: null,
    };
  }
  return store;
}

export { reduceBackupStore };
