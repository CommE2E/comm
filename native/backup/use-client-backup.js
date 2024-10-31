// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import {
  latestBackupInfoResponseValidator,
  siweBackupDataValidator,
  type LatestBackupInfo,
  type SIWEBackupData,
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
  +retrieveLatestBackupInfo: () => Promise<LatestBackupInfo>,
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

  const restorePasswordUserBackupProtocol = React.useCallback(async () => {
    if (!accountHasPassword(currentUserInfo)) {
      throw new Error(
        'Attempt to restore from password for non-password user.',
      );
    }

    const [latestBackupInfo, backupSecret] = await Promise.all([
      retrieveLatestBackupInfo(),
      getBackupSecret(),
    ]);

    console.info('Start restoring backup...');
    await commCoreModule.restoreBackup(
      backupSecret,
      persistConfig.version.toString(),
      latestBackupInfo.backupID,
    );
    console.info('Backup restored.');
  }, [currentUserInfo, retrieveLatestBackupInfo]);

  return React.useMemo(
    () => ({
      uploadBackupProtocol,
      restorePasswordUserBackupProtocol,
      retrieveLatestSIWEBackupData,
      retrieveLatestBackupInfo,
    }),
    [
      restorePasswordUserBackupProtocol,
      retrieveLatestBackupInfo,
      retrieveLatestSIWEBackupData,
      uploadBackupProtocol,
    ],
  );
}

export { getBackupSecret, useClientBackup };
