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
  +createUserDataBackup: () => Promise<string>,
  +createUserKeysBackup: () => Promise<string>,
  +retrieveLatestBackupInfo: (
    userIdentifier: string,
  ) => Promise<?LatestBackupInfo>,
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

async function retrieveLatestBackupInfo(
  userIdentifier: string,
): Promise<?LatestBackupInfo> {
  try {
    const response =
      await commCoreModule.retrieveLatestBackupInfo(userIdentifier);

    const parsedResponse = JSON.parse(response);
    if (!parsedResponse) {
      return null;
    }
    console.log(parsedResponse);

    return assertWithValidator<LatestBackupInfo>(
      parsedResponse,
      latestBackupInfoResponseValidator,
    );
  } catch (e) {
    console.log('Retrieve latest info fail:', e);
    throw e;
  }
}

function useClientBackup(): ClientBackup {
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
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

  const createUserDataBackup = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to upload User Data for not logged in user.');
    }

    const backupSecret = await getBackupSecret();
    const callback = (backupID: string) => {
      console.log('Compaction created. Starting upload. backupID:', backupID);
    };
    const result = await authVerifiedEndpoint(
      commCoreModule.createFullBackup(backupSecret, callback),
    );
    console.log('Compaction uploaded. backupID:', result);
    return result;
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

  return React.useMemo(
    () => ({
      createUserDataBackup,
      createUserKeysBackup,
      retrieveLatestBackupInfo,
      getBackupUserKeys,
    }),
    [createUserDataBackup, createUserKeysBackup],
  );
}

export { useClientBackup };
