// @flow

import * as React from 'react';

import { useSelector } from '../utils/redux-utils.js';
import { fullBackupSupport } from '../utils/services-utils.js';

function useIsUserDataReady(): boolean {
  const restoreBackupState = useSelector(
    state => state.restoreBackupState.status,
  );
  return React.useMemo(() => {
    if (!fullBackupSupport) {
      return true;
    }
    // TODO: This is a stub. Handle this better,
    // distinguish "logged in" and "logged out" backup states
    return (
      restoreBackupState === 'user_data_restore_completed' ||
      restoreBackupState.indexOf('user_data_backup_') !== -1
    );
  }, [restoreBackupState]);
}

export { useIsUserDataReady };
