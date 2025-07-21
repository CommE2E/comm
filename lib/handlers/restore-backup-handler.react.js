// @flow

import * as React from 'react';

import { useUserDataRestoreContext } from '../backup/user-data-restore-context.js';
import { usePersistedStateLoaded } from '../selectors/app-state-selectors.js';
import { useSelector } from '../utils/redux-utils.js';
import { fullBackupSupport } from '../utils/services-utils.js';

function RestoreBackupHandler(): React.Node {
  const persistedStateLoaded = usePersistedStateLoaded();
  // We want this handler to be executed only once
  const executed = React.useRef(false);
  const restoreBackupState = useSelector(state => state.restoreBackupState);
  const { restoreUserData } = useUserDataRestoreContext();

  React.useEffect(() => {
    if (!fullBackupSupport || !persistedStateLoaded || executed.current) {
      return;
    }
    if (
      restoreBackupState.status !== 'user_data_restore_step_completed' &&
      restoreBackupState.status !== 'user_data_restore_failed'
    ) {
      return;
    }

    void restoreUserData();
    executed.current = true;
  }, [persistedStateLoaded, restoreBackupState.status, restoreUserData]);

  return null;
}

export { RestoreBackupHandler };
