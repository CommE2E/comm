// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import type {
  BackupAuth,
  UserData,
  BackupEncrypted,
} from 'lib/types/backup-types.js';

import { getBackupID, getUserData, getUserKeys, uploadBackup } from './api.js';
import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

// purpose of this result is to improve logging and
// testing the initial backup version
type RestoreBackupResult = {
  getBackupID?: boolean,
  getUserKeys?: boolean,
  getUserData?: boolean,
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

  const uploadBackupProtocol = React.useCallback(
    async (userData: UserData) => {
      if (!loggedIn || !currentUserID) {
        throw new Error('Attempt to upload backup for not logged in user.');
      }
      console.info('Start uploading backup...');

      const backupSecret = await getBackupSecret();

      const encryptedBackupStr = await commCoreModule.createNewBackup(
        backupSecret,
        JSON.stringify(userData),
      );

      const encryptedBackup: BackupEncrypted = JSON.parse(encryptedBackupStr);

      const ed25519 = await getContentSigningKey();
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
        decryptUserData: undefined,
        userDataIntegrity: undefined,
        error: undefined,
      };

      const backupIDPromise: Promise<?string> = (async () => {
        try {
          // We are using UserID instead of the username.
          // The reason is that the initial version of the backup service
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

      const userKeysPromise: Promise<?string> = (async () => {
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
      const userDataPromise: Promise<?string> = (async () => {
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

      if (!userDataResponse) {
        result.getUserData = false;
        result.error = new Error('UserData response is empty');
        return result;
      }

      const backupSecret = await getBackupSecret();

      let userData: UserData;
      try {
        const restoreResultStr = await commCoreModule.restoreBackup(
          backupID,
          backupSecret,
          userKeysResponse,
          userDataResponse,
        );
        const { userData: userDataStr } = JSON.parse(restoreResultStr);
        userData = JSON.parse(userDataStr);
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
