// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import { useSelector } from 'react-redux';

import { uintArrayToHexString } from 'lib/media/data-utils.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import type { BackupAuth, UserData, UserKeys } from 'lib/types/backup-types.js';

import { getBackupID, getUserData, getUserKeys, uploadBackup } from './api.js';
import { BACKUP_ID_LENGTH } from './constants.js';
import {
  decryptUserData,
  decryptUserKeys,
  encryptBackup,
} from './encryption.js';
import { commCoreModule } from '../native-modules.js';
import { generateKey } from '../utils/aes-crypto-module.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

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

      const backupIDPromise = (async () => {
        try {
          // We are using UserID instead of the username.
          // The reason is tha the initial version of the backup service
          // cannot get UserID based on username.
          const backupID = await getBackupID(currentUserID);
          result.getBackupID = true;
          return backupID;
        } catch (e) {
          result.getBackupID = false;
          result.error = e;
          return undefined;
        }
      })();

      const [ed25519, backupID] = await Promise.all([
        getContentSigningKey(),
        backupIDPromise,
      ]);

      if (!backupID) {
        return result;
      }

      const backupAuth: BackupAuth = {
        userID: currentUserID,
        accessToken: accessToken ? accessToken : '',
        deviceID: ed25519,
      };

      const userKeysPromise = (async () => {
        try {
          const userKeysResponse = await getUserKeys(backupID, backupAuth);
          result.getUserKeys = true;
          return userKeysResponse;
        } catch (e) {
          result.getUserKeys = false;
          result.error = e;
          return undefined;
        }
      })();
      const userDataPromise = (async () => {
        try {
          const userDataResponse = await getUserData(backupID, backupAuth);
          result.getUserData = true;
          return userDataResponse;
        } catch (e) {
          result.getUserData = false;
          result.error = e;
          return undefined;
        }
      })();

      const [userKeysResponse, userDataResponse] = await Promise.all([
        userKeysPromise,
        userDataPromise,
      ]);

      if (!userKeysResponse) {
        result.getUserKeys = false;
        result.error = new Error('UserKeys response is empty');
        return result;
      }

      let userKeys;
      try {
        userKeys = await decryptUserKeys(backupID, userKeysResponse.buffer);
        result.decryptUserKeys = true;
      } catch (e) {
        result.decryptUserKeys = false;
        result.error = e;
      }

      if (!userKeys) {
        result.decryptUserKeys = false;
        result.error = new Error('UserKeys is empty');
        return result;
      }

      if (!userDataResponse) {
        result.getUserData = false;
        result.error = new Error('UserData response is empty');
        return result;
      }

      let userData;
      try {
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
