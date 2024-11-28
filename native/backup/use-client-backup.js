// @flow

import * as React from 'react';

import { useInvalidCSATLogOut } from 'lib/actions/user-actions.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  type LatestBackupInfo,
  latestBackupInfoResponseValidator,
  type UserKeys,
  userKeysResponseValidator,
} from 'lib/types/backup-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
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

  const invalidTokenLogOut = useInvalidCSATLogOut();
  const authVerifiedEndpoint: <T>(backupCallPromise: Promise<T>) => Promise<T> =
    React.useCallback(
      async backupCallPromise => {
        try {
          return await backupCallPromise;
        } catch (e) {
          const message = getMessageForException(e);
          if (message === 'Unauthenticated') {
            void invalidTokenLogOut();
          }
          throw e;
        }
      },
      [invalidTokenLogOut],
    );

  const createFullBackup = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to upload backup for not logged in user.');
    }

    const backupSecret = await getBackupSecret();
    return authVerifiedEndpoint(commCoreModule.createFullBackup(backupSecret));
  }, [loggedIn, currentUserID, getBackupSecret, authVerifiedEndpoint]);

  const createUserKeysBackup = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to upload User Keys for not logged in user.');
    }

    const backupSecret = await getBackupSecret();
    return authVerifiedEndpoint(
      commCoreModule.createUserKeysBackup(backupSecret),
    );
  }, [loggedIn, currentUserID, getBackupSecret, authVerifiedEndpoint]);

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
