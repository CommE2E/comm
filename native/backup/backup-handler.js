// @flow

import * as React from 'react';

import { useCheckIfPrimaryDevice } from 'lib/hooks/primary-device-hooks.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useStaffAlert } from 'lib/shared/staff-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function BackupHandler(): null {
  const loggedIn = useSelector(isLoggedIn);
  const staffCanSee = useStaffCanSee();
  const isBackground = useSelector(
    state => state.lifecycleState === 'background',
  );
  const canPerformBackupOperation = loggedIn && !isBackground;
  const checkIfPrimaryDevice = useCheckIfPrimaryDevice();
  const { showAlertToStaff } = useStaffAlert();

  React.useEffect(() => {
    if (!staffCanSee) {
      return;
    }

    void (async () => {
      const isPrimaryDevice = await checkIfPrimaryDevice();
      if (!isPrimaryDevice) {
        return;
      }

      if (canPerformBackupOperation) {
        try {
          commCoreModule.startBackupHandler();
        } catch (err) {
          const message = getMessageForException(err) ?? 'unknown error';
          showAlertToStaff('Error starting backup handler', message);
          console.log('Error starting backup handler:', message);
        }
      } else {
        try {
          commCoreModule.stopBackupHandler();
        } catch (err) {
          const message = getMessageForException(err) ?? 'unknown error';
          showAlertToStaff('Error stopping backup handler', message);
          console.log('Error stopping backup handler:', message);
        }
      }
    })();
  }, [
    staffCanSee,
    loggedIn,
    isBackground,
    checkIfPrimaryDevice,
    canPerformBackupOperation,
    showAlertToStaff,
  ]);

  return null;
}

export default BackupHandler;
