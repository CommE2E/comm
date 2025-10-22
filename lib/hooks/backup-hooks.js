// @flow

import * as React from 'react';

import type { RestoreBackupState } from '../types/backup-types.js';
import { useSelector } from '../utils/redux-utils.js';
import { useFullBackupSupportEnabled } from '../utils/services-utils.js';

// list of states for which user data is considered ready
const loggedInStates: $ReadOnlyArray<RestoreBackupState['status']> = [
  'no_backup',
  'user_data_restore_completed',
  'user_data_backup_started',
  'user_data_backup_success',
  'user_data_backup_failed',
];

function useIsUserDataReady(): boolean {
  const restoreBackupState = useSelector(state => state.restoreBackupState);
  const isBackgroundUserKeysUpload = React.useMemo(() => {
    return (
      restoreBackupState.status === 'user_keys_backup_started' ||
      restoreBackupState.status === 'user_keys_backup_failed' ||
      (restoreBackupState.status === 'user_keys_backup_success' &&
        restoreBackupState.payload?.source === 'upload')
    );
  }, [restoreBackupState.payload?.source, restoreBackupState.status]);

  const fullBackupSupport = useFullBackupSupportEnabled();
  return React.useMemo(() => {
    if (!fullBackupSupport) {
      return true;
    }
    return (
      loggedInStates.includes(restoreBackupState.status) ||
      isBackgroundUserKeysUpload
    );
  }, [
    fullBackupSupport,
    isBackgroundUserKeysUpload,
    restoreBackupState.status,
  ]);
}

export { useIsUserDataReady };
