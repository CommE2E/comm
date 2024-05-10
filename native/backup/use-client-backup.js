// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import type { SIWEBackupSecrets } from 'lib/types/siwe-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';
import { persistConfig } from '../redux/persist.js';
import { useSelector } from '../redux/redux-utils.js';

type SIWEBackupData = {
  +backupID: string,
  +siweBackupMsg: string,
  +siweBackupMsgNonce: string,
  +siweBackupMsgStatement: string,
  +siweBackupMsgIssuedAt: string,
};

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
    await setMockCommServicesAuthMetadata();

    const backupSecret = await getBackupSecret();
    await commCoreModule.restoreBackup(
      backupSecret,
      persistConfig.version.toString(),
    );

    console.info('Backup restored.');
    return;
  }, [
    currentUserID,
    loggedIn,
    setMockCommServicesAuthMetadata,
    currentUserInfo,
  ]);

  const retrieveLatestSIWEBackupData = React.useCallback(async () => {
    if (!loggedIn || !currentUserID) {
      throw new Error('Attempt to restore backup for not logged in user.');
    }

    if (accountHasPassword(currentUserInfo)) {
      throw new Error(
        'Attempt to retrieve siwe backup data for password user.',
      );
    }

    await setMockCommServicesAuthMetadata();
    const serializedBackupData =
      await commCoreModule.retrieveLatestSIWEBackupData();
    const siweBackupData: SIWEBackupData = JSON.parse(serializedBackupData);
    return siweBackupData;
  }, [
    currentUserID,
    currentUserInfo,
    loggedIn,
    setMockCommServicesAuthMetadata,
  ]);

  return {
    uploadBackupProtocol,
    restorePasswordUserBackupProtocol,
    retrieveLatestSIWEBackupData,
  };
}

export { getBackupSecret, useClientBackup };
