// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import {
  type SIWEBackupData,
  siweBackupDataValidator,
} from 'lib/types/backup-types.js';
import type { SIWEBackupSecrets } from 'lib/types/siwe-types.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';
import { persistConfig } from '../redux/persist.js';
import { useSelector } from '../redux/redux-utils.js';

type ClientBackup = {
  +uploadBackupProtocol: () => Promise<void>,
  +restorePasswordUserBackupProtocol: () => Promise<void>,
  +retrieveLatestSIWEBackupData: () => Promise<SIWEBackupData>,
};

async function getBackupSecret(): Promise<string> {
  const nativeCredentials = await fetchNativeKeychainCredentials();
  if (!nativeCredentials) {
    throw new Error('Native credentials are missing');
  }
  return nativeCredentials.password;
}

async function getSIWEBackupSecrets(): Promise<SIWEBackupSecrets> {
  const siweBackupSecrets = await commCoreModule.getSIWEBackupSecrets();
  if (!siweBackupSecrets) {
    throw new Error('SIWE backup message and its signature are missing');
  }
  return siweBackupSecrets;
}

function useClientBackup(): ClientBackup {
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const loggedIn = useSelector(isLoggedIn);

  const uploadBackupProtocol = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to upload backup for not logged in user.');
    }

    console.info('Start uploading backup...');

    if (accountHasPassword(currentUserInfo)) {
      const backupSecret = await getBackupSecret();
      await commCoreModule.createNewBackup(backupSecret);
    } else {
      const { message, signature } = await getSIWEBackupSecrets();
      await commCoreModule.createNewSIWEBackup(signature, message);
    }

    console.info('Backup uploaded.');
  }, [currentUserID, loggedIn, currentUserInfo]);

  const restorePasswordUserBackupProtocol = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to restore backup for not logged in user.');
    }

    if (!accountHasPassword(currentUserInfo)) {
      throw new Error(
        'Attempt to restore from password for non-password user.',
      );
    }

    console.info('Start restoring backup...');

    const backupSecret = await getBackupSecret();
    await commCoreModule.restoreBackup(
      backupSecret,
      persistConfig.version.toString(),
    );

    console.info('Backup restored.');
  }, [currentUserID, loggedIn, currentUserInfo]);

  const retrieveLatestSIWEBackupData = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to restore backup for not logged in user.');
    }

    if (accountHasPassword(currentUserInfo)) {
      throw new Error(
        'Attempt to retrieve siwe backup data for password user.',
      );
    }

    const serializedBackupData =
      await commCoreModule.retrieveLatestSIWEBackupData();

    return assertWithValidator(
      JSON.parse(serializedBackupData),
      siweBackupDataValidator,
    );
  }, [currentUserID, currentUserInfo, loggedIn]);

  return {
    uploadBackupProtocol,
    restorePasswordUserBackupProtocol,
    retrieveLatestSIWEBackupData,
  };
}

export { getBackupSecret, useClientBackup };
