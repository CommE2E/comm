// @flow

import * as React from 'react';

import type { RestoreBackupState } from '../types/backup-types.js';
import { useSelector } from '../utils/redux-utils.js';
import { fullBackupSupport } from '../utils/services-utils.js';

// list of states for which user data is considered ready
const loggedInStates: $ReadOnlyArray<RestoreBackupState['status']> = [
  'no_backup',
  'user_data_restore_completed',
  'user_data_backup_started',
  'user_data_backup_success',
  'user_data_backup_failed',
];

function useIsUserDataReady(): boolean {
  const restoreBackupState = useSelector(
    state => state.restoreBackupState.status,
  );
  return React.useMemo(() => {
    if (!fullBackupSupport) {
      return true;
    }
    return loggedInStates.includes(restoreBackupState);
  }, [restoreBackupState]);
}

export { useIsUserDataReady };
