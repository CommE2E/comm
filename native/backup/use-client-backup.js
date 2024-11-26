// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  latestBackupInfoResponseValidator,
  type LatestBackupInfo,
  type UserKeys,
  userKeysResponseValidator,
} from 'lib/types/backup-types.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { useGetBackupSecretForLoggedInUser } from './use-get-backup-secret.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

type ClientBackup = {
  +createFullBackup: () => Promise<string>,
  +createUserKeysBackup: () => Promise<string>,
  +retrieveLatestBackupInfo: () => Promise<{
    +latestBackupInfo: LatestBackupInfo,
    +userIdentifier: string,
  }>,
  +getBackupUserKeys: (
    userIdentifier: string,
    backupSecret: string,
    backupID: string,
  ) => Promise<UserKeys>,
};

async function getBackupUserKeys(
  userIdentifier: string,
  backupSecret: string,
  backupID: string,
): Promise<UserKeys> {
  const userKeysResponse = await commCoreModule.getBackupUserKeys(
    userIdentifier,
    backupSecret,
    backupID,
  );
  return assertWithValidator(
    JSON.parse(userKeysResponse),
    userKeysResponseValidator,
  );
}

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
    return commCoreModule.createFullBackup(backupSecret);
  }, [loggedIn, currentUserID, getBackupSecret]);

  const createUserKeysBackup = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to upload User Keys for not logged in user.');
    }

    const backupSecret = await getBackupSecret();
    return commCoreModule.createUserKeysBackup(backupSecret);
  }, [loggedIn, currentUserID, getBackupSecret]);

  const retrieveLatestBackupInfo = React.useCallback(async () => {
    if (!loggedIn || !currentUserID || !currentUserInfo?.username) {
      throw new Error('Attempt to restore backup for not logged in user.');
    }
    const userIdentifier = currentUserInfo?.username;

    const response =
      await commCoreModule.retrieveLatestBackupInfo(userIdentifier);

    const latestBackupInfo = assertWithValidator<LatestBackupInfo>(
      JSON.parse(response),
      latestBackupInfoResponseValidator,
    );
    return { latestBackupInfo, userIdentifier };
  }, [currentUserID, currentUserInfo, loggedIn]);

  return React.useMemo(
    () => ({
      createFullBackup,
      createUserKeysBackup,
      retrieveLatestBackupInfo,
      getBackupUserKeys,
    }),
    [createFullBackup, createUserKeysBackup, retrieveLatestBackupInfo],
  );
}

export { useClientBackup };
