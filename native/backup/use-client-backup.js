// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  latestBackupInfoResponseValidator,
  type LatestBackupInfo,
} from 'lib/types/backup-types.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { useGetBackupSecretForLoggedInUser } from './use-get-backup-secret.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

type ClientBackup = {
  +createFullBackup: () => Promise<void>,
  +createUserKeysBackup: () => Promise<void>,
  +retrieveLatestBackupInfo: () => Promise<LatestBackupInfo>,
};

function useClientBackup(): ClientBackup {
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const loggedIn = useSelector(isLoggedIn);
  const getBackupSecret = useGetBackupSecretForLoggedInUser();

  const createFullBackup = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to upload backup for not logged in user.');
    }

    const backupSecret = await getBackupSecret();
    await commCoreModule.createFullBackup(backupSecret);
  }, [loggedIn, currentUserID, getBackupSecret]);

  const createUserKeysBackup = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to upload User Keys for not logged in user.');
    }

    const backupSecret = await getBackupSecret();
    await commCoreModule.createUserKeysBackup(backupSecret);
  }, [loggedIn, currentUserID, getBackupSecret]);

  const retrieveLatestBackupInfo = React.useCallback(async () => {
    if (!loggedIn || !currentUserID || !currentUserInfo?.username) {
      throw new Error('Attempt to restore backup for not logged in user.');
    }
    const userIdentitifer = currentUserInfo?.username;

    const response =
      await commCoreModule.retrieveLatestBackupInfo(userIdentitifer);

    return assertWithValidator<LatestBackupInfo>(
      JSON.parse(response),
      latestBackupInfoResponseValidator,
    );
  }, [currentUserID, currentUserInfo, loggedIn]);

  return React.useMemo(
    () => ({
      createFullBackup,
      createUserKeysBackup,
      retrieveLatestBackupInfo,
    }),
    [retrieveLatestBackupInfo, createFullBackup, createUserKeysBackup],
  );
}

export { useClientBackup };
