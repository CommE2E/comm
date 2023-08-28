// @flow

import { hexToUintArray } from 'lib/media/data-utils.js';
import type { Backup, BackupEncrypted } from 'lib/types/backup-types.js';

import { convertObjToBytes } from './conversion-utils.js';
import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';
import * as AES from '../utils/aes-crypto-module.js';

async function getBackupKey(backupID: string): Promise<Uint8Array> {
  const nativeCredentials = await fetchNativeKeychainCredentials();
  if (!nativeCredentials) {
    throw new Error('Native credentials are missing');
  }
  const { password } = nativeCredentials;
  const backupKey = await commCoreModule.computeBackupKey(password, backupID);
  return new Uint8Array(backupKey);
}

async function encryptBackup(backup: Backup): Promise<BackupEncrypted> {
  const { backupID, userKeys, userData } = backup;
  const userKeysBytes = convertObjToBytes(userKeys);
  const backupKey = await getBackupKey(backupID);
  const ct1 = AES.encrypt(backupKey, userKeysBytes);

  const userDataBytes = convertObjToBytes(userData);
  const backupDataKey = hexToUintArray(userKeys.backupDataKey);
  const ct2 = AES.encrypt(backupDataKey, userDataBytes);

  return { backupID, userKeys: ct1, userData: ct2 };
}

export { getBackupKey, encryptBackup };
