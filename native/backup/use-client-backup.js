// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import { uintArrayToHexString } from 'lib/media/data-utils.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import type { BackupAuth, UserData, UserKeys } from 'lib/types/backup-types.js';

import { uploadBackup } from './api.js';
import { BACKUP_ID_LENGTH } from './constants.js';
import { encryptBackup } from './encryption.js';
import { commCoreModule } from '../native-modules.js';
import { generateKey } from '../utils/aes-crypto-module.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

type ClientBackup = {
  +uploadBackupProtocol: (userData: UserData) => Promise<void>,
};

function useClientBackup(): ClientBackup {
  const accessToken = useSelector(state => state.commServicesAccessToken);
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const loggedIn = useSelector(isLoggedIn);

  const uploadBackupProtocol = React.useCallback(
    async (userData: UserData) => {
      if (!loggedIn || !currentUserID) {
        throw new Error('Attempt to upload backup for not logged in user.');
      }
      console.info('Start uploading backup...');

      const backupDataKey = generateKey();

      const [ed25519, backupID] = await Promise.all([
        getContentSigningKey(),
        commCoreModule.generateRandomString(BACKUP_ID_LENGTH),
      ]);

      const userKeys: UserKeys = {
        backupDataKey: uintArrayToHexString(backupDataKey),
        ed25519,
      };

      const encryptedBackup = await encryptBackup({
        backupID,
        userKeys,
        userData,
      });

      const backupAuth: BackupAuth = {
        userID: currentUserID,
        accessToken: accessToken ? accessToken : '',
        deviceID: ed25519,
      };

      await uploadBackup(encryptedBackup, backupAuth);
      console.info('Backup uploaded.');
    },
    [accessToken, currentUserID, loggedIn],
  );

  return { uploadBackupProtocol };
}

export { useClientBackup };
