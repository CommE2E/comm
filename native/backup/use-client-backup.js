// @flow

import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import {
  latestBackupInfoResponseValidator,
  type LatestBackupInfo,
} from 'lib/types/backup-types.js';
import type { SIWEBackupSecrets } from 'lib/types/siwe-types.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

type ClientBackup = {
  +uploadBackupProtocol: () => Promise<void>,
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
      uploadBackupProtocol,
      retrieveLatestBackupInfo,
    }),
    [retrieveLatestBackupInfo, uploadBackupProtocol],
  );
}

export { getBackupSecret, useClientBackup };
