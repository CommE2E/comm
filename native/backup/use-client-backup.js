// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import type { SIWEBackupSecrets } from 'lib/types/siwe-types.js';
import type { CurrentUserInfo } from 'lib/types/user-types';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { runMigrations } from 'lib/utils/migration-utils.js';

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';
import { defaultState } from '../redux/default-state.js';
import {
  legacyMigrations,
  migrations,
  persistConfig,
} from '../redux/persist.js';
import { useSelector } from '../redux/redux-utils.js';

type ClientBackup = {
  +uploadBackupProtocol: () => Promise<void>,
  +restoreBackupProtocol: () => Promise<void>,
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

async function createBackup(currentUserInfo: ?CurrentUserInfo): Promise<void> {
  commCoreModule.startBackupHandler();
  if (accountHasPassword(currentUserInfo)) {
    const backupSecret = await getBackupSecret();
    await commCoreModule.createNewBackup(backupSecret);
  } else {
    const { message, signature } = await getSIWEBackupSecrets();
    await commCoreModule.createNewSIWEBackup(signature, message);
  }
}

function useClientBackup(): ClientBackup {
  const accessToken = useSelector(state => state.commServicesAccessToken);
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const loggedIn = useSelector(isLoggedIn);

  const setMockCommServicesAuthMetadata = React.useCallback(async () => {
    if (!currentUserID) {
      return;
    }

    const ed25519 = await getContentSigningKey();
    await commCoreModule.setCommServicesAuthMetadata(
      currentUserID,
      ed25519,
      accessToken ? accessToken : '',
    );
  }, [accessToken, currentUserID]);

  const uploadBackupProtocol = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to upload backup for not logged in user.');
    }

    console.info('Start uploading backup...');

    await setMockCommServicesAuthMetadata();

    await createBackup(currentUserInfo);

    console.info('Backup uploaded.');
  }, [
    currentUserID,
    loggedIn,
    setMockCommServicesAuthMetadata,
    currentUserInfo,
  ]);

  const restoreBackupProtocol = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to restore backup for not logged in user.');
    }

    console.info('Start restoring backup...');

    await setMockCommServicesAuthMetadata();
    const backupSecret = await getBackupSecret();
    await commCoreModule.restoreBackup(backupSecret);

    const backupVersion = await commCoreModule.getSyncedDatabaseVersion();
    const backupVersionNumber = parseInt(backupVersion);
    if (!backupVersion || backupVersionNumber > persistConfig.version) {
      throw new Error(`Incompatible backup version ${backupVersion ?? -1}`);
    }

    console.info('Running backup migrations...');
    await runMigrations(
      legacyMigrations,
      migrations,
      {
        ...defaultState,
        _persist: {
          version: backupVersionNumber,
          rehydrated: true,
        },
        currentUserInfo,
      },
      backupVersionNumber,
      persistConfig.version,
      process.env.NODE_ENV !== 'production',
    );

    console.info('Backup restored.');
  }, [
    currentUserID,
    currentUserInfo,
    loggedIn,
    setMockCommServicesAuthMetadata,
  ]);

  return { uploadBackupProtocol, restoreBackupProtocol };
}

export { getBackupSecret, useClientBackup, createBackup };
