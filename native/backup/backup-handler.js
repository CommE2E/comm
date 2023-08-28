// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { useSelector } from 'react-redux';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { BACKUP_HASH_STORAGE_KEY } from './constants.js';
import { convertObjToBytes } from './conversion-utils.js';
import { useClientBackup } from './use-client-backup.js';
import { commUtilsModule } from '../native-modules.js';
import Alert from '../utils/alert.js';
import { useIsCurrentUserStaff } from '../utils/staff-utils.js';

function BackupHandler(): null {
  const userStore = useSelector(state => state.userStore);
  const currentUserID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const loggedIn = useSelector(isLoggedIn);
  const isStaff = useIsCurrentUserStaff();

  const { uploadBackupProtocol } = useClientBackup();

  React.useEffect(() => {
    (async () => {
      if (!loggedIn || !(isStaff || isDev)) {
        return;
      }

      const userData = { userStore };
      const userDataBytes = convertObjToBytes(userData);
      const sha256Hash = commUtilsModule.sha256(userDataBytes.buffer);

      const recentBackupHash = await AsyncStorage.getItem(
        BACKUP_HASH_STORAGE_KEY,
      );

      if (!recentBackupHash || sha256Hash !== recentBackupHash) {
        let message;
        try {
          await uploadBackupProtocol(userData);
          message = 'Backup successfully uploaded';
          await AsyncStorage.setItem(BACKUP_HASH_STORAGE_KEY, sha256Hash);
        } catch (e) {
          console.error(`Backup uploading error: ${e}`);
          message = `Backup uploading error: ${String(
            getMessageForException(e),
          )}`;
        }
        Alert.alert('Backup protocol result', message);
      }
    })();
  }, [currentUserID, isStaff, loggedIn, uploadBackupProtocol, userStore]);

  return null;
}

export default BackupHandler;
