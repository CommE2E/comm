// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import type { SIWEBackupSecrets } from 'lib/types/siwe-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';
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

    if (accountHasPassword(currentUserInfo)) {
      const backupSecret = await getBackupSecret();
      await commCoreModule.createNewBackup(backupSecret);
    } else {
      const { message, signature } = await getSIWEBackupSecrets();
      await commCoreModule.createNewSIWEBackup(signature, message);
    }

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

    console.info('Backup restored.');
  }, [currentUserID, loggedIn, setMockCommServicesAuthMetadata]);

  return { uploadBackupProtocol, restoreBackupProtocol };
}

export { getBackupSecret, useClientBackup };
