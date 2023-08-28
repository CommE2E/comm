// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import { useSelector } from 'react-redux';

import { uintArrayToHexString } from 'lib/media/data-utils.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import type { BackupAuth, UserData, UserKeys } from 'lib/types/backup-types.js';

import {
  getBackupID,
  getUserData,
  getUserKeysAuth,
  uploadBackup,
} from './api.js';
import { BACKUP_ID_LENGTH } from './constants.js';
import {
  decryptUserData,
  decryptUserKeys,
  encryptBackup,
} from './encryption.js';
import { commCoreModule } from '../native-modules.js';
import { generateKey } from '../utils/aes-crypto-module.js';

// purpose of this result is to improve logging and
// testing the initial backup version
type RestoreBackupResult = {
  getBackupID?: boolean,
  getUserKeys?: boolean,
  getUserData?: boolean,
  decryptUserKeys?: boolean,
  decryptUserData?: boolean,
  userDataIntegrity?: boolean,
  error?: Error,
};

type ClientBackup = {
  +uploadBackupProtocol: (userData: UserData) => Promise<void>,
  +restoreBackupProtocol: (
    expectedUserData: UserData,
  ) => Promise<RestoreBackupResult>,
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
      await commCoreModule.initializeCryptoAccount();
      const {
        primaryIdentityPublicKeys: { ed25519 },
      } = await commCoreModule.getUserPublicKey();
      const userKeys: UserKeys = {
        backupDataKey: uintArrayToHexString(backupDataKey),
        ed25519,
      };

      const backupID = await commCoreModule.generateRandomString(
        BACKUP_ID_LENGTH,
      );

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

  const restoreBackupProtocol = React.useCallback(
    async (expectedUserData: UserData) => {
      if (!loggedIn || !currentUserID) {
        throw new Error('Attempt to restore backup for not logged in user.');
      }

      const result: RestoreBackupResult = {
        getBackupID: undefined,
        getUserKeys: undefined,
        getUserData: undefined,
        decryptUserKeys: undefined,
        decryptUserData: undefined,
        userDataIntegrity: undefined,
        error: undefined,
      };

      await commCoreModule.initializeCryptoAccount();
      const {
        primaryIdentityPublicKeys: { ed25519 },
      } = await commCoreModule.getUserPublicKey();
      const backupAuth: BackupAuth = {
        userID: currentUserID,
        accessToken: accessToken ? accessToken : '',
        deviceID: ed25519,
      };

      let backupID;
      try {
        backupID = await getBackupID(currentUserID);
        result.getBackupID = true;
      } catch (e) {
        result.getBackupID = false;
        result.error = e;
        return result;
      }

      let userKeysResponse;
      try {
        userKeysResponse = await getUserKeysAuth(backupID, backupAuth);
        result.getUserKeys = true;
      } catch (e) {
        result.getUserKeys = false;
        result.error = e;
      }

      let userDataResponse;
      try {
        userDataResponse = await getUserData(backupID, backupAuth);
        result.getUserData = true;
      } catch (e) {
        result.getUserData = false;
        result.error = e;
      }

      let userKeys;
      try {
        if (!userKeysResponse) {
          throw new Error('UserKeys is not defined');
        }
        userKeys = await decryptUserKeys(backupID, userKeysResponse.buffer);
        result.decryptUserKeys = true;
      } catch (e) {
        result.decryptUserKeys = false;
        result.error = e;
      }

      let userData;
      try {
        if (!userDataResponse) {
          throw new Error('UserData is not defined');
        }
        if (!userKeys) {
          throw new Error('Decrypted UserKeys is not defined');
        }
        userData = await decryptUserData(
          userKeys.backupDataKey,
          userDataResponse.buffer,
        );
        result.decryptUserData = true;
      } catch (e) {
        result.decryptUserData = false;
        result.error = e;
      }

      result.userDataIntegrity = !!_isEqual(userData, expectedUserData);

      return result;
    },
    [accessToken, currentUserID, loggedIn],
  );

  return { uploadBackupProtocol, restoreBackupProtocol };
}

export { useClientBackup };
