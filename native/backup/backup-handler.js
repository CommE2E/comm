// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function BackupHandler(): null {
  const isBackupEnabled = useSelector(
    state => state.localSettings.isBackupEnabled,
  );
  const loggedIn = useSelector(isLoggedIn);
  const staffCanSee = useStaffCanSee();
  const isBackground = useSelector(
    state => state.lifecycleState === 'background',
  );

  React.useEffect(() => {
    if (!staffCanSee) {
      return;
    }

    if (isBackupEnabled && loggedIn && !isBackground) {
      try {
        commCoreModule.startBackupHandler();
      } catch (err) {
        console.log('Error starting backup handler:', err);
      }
    } else {
      try {
        commCoreModule.stopBackupHandler();
      } catch (err) {
        console.log('Error stopping backup handler:', err);
      }
    }
  }, [isBackupEnabled, staffCanSee, loggedIn, isBackground]);

  return null;
}

export default BackupHandler;
