// @flow

import { fetchNativeKeychainCredentials } from '../account/native-credentials.js';
import { commCoreModule } from '../native-modules.js';

async function getBackupKey(backupID: string): Promise<Uint8Array> {
  const nativeCredentials = await fetchNativeKeychainCredentials();
  if (!nativeCredentials) {
    throw new Error('Native credentials are missing');
  }
  const { password } = nativeCredentials;
  const backupKey = await commCoreModule.computeBackupKey(password, backupID);
  return new Uint8Array(backupKey);
}

export { getBackupKey };
