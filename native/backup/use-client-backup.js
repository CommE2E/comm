// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import type { UserStore } from 'lib/types/user-types.js';

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

type UserData = {
  +userStore: UserStore,
};

type ClientBackup = {
  +uploadBackupProtocol: () => Promise<void>,
  +restoreBackupProtocol: (
    expectedUserData: UserData,
  ) => Promise<{ +dataIntegritySuccess: boolean }>,
};

async function getBackupSecret(): Promise<string> {
  const nativeCredentials = await fetchNativeKeychainCredentials();
  if (!nativeCredentials) {
    throw new Error('Native credentials are missing');
  }
  return nativeCredentials.password;
}

function useClientBackup(): ClientBackup {
  const accessToken = useSelector(state => state.commServicesAccessToken);
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const loggedIn = useSelector(isLoggedIn);

  const uploadBackupProtocol = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to upload backup for not logged in user.');
    }
    console.info('Start uploading backup...');

    const ed25519 = await getContentSigningKey();
    await commCoreModule.setCommServicesAuthMetadata(
      currentUserID,
      ed25519,
      accessToken ? accessToken : '',
    );

    const backupSecret = await getBackupSecret();
    await commCoreModule.createNewBackup(backupSecret);

    console.info('Backup uploaded.');
  }, [accessToken, currentUserID, loggedIn]);

  const restoreBackupProtocol = React.useCallback(
    async (expectedUserData: UserData) => {
      if (!loggedIn || !currentUserID) {
        throw new Error('Attempt to restore backup for not logged in user.');
      }

      const backupSecret = await getBackupSecret();
      const restoreResultStr = await commCoreModule.restoreBackup(backupSecret);
      const { userData }: { userData: UserData } = JSON.parse(restoreResultStr);

      return { dataIntegritySuccess: !!_isEqual(userData, expectedUserData) };
    },
    [currentUserID, loggedIn],
  );

  return { uploadBackupProtocol, restoreBackupProtocol };
}

export { useClientBackup };
