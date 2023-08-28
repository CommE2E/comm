// @flow

import base64 from 'base-64';

import backupService from 'lib/facts/backup-service.js';
import type { BackupAuth, BackupEncrypted } from 'lib/types/backup-types.js';
import { makeBackupServiceEndpointURL } from 'lib/utils/backup-service.js';
import { toBase64URL } from 'lib/utils/base64.js';

import { commUtilsModule } from '../native-modules.js';

function getBackupFormData(backup: BackupEncrypted): FormData {
  const { backupID, userKeys, userData } = backup;
  const userKeysHash = commUtilsModule.sha256(userKeys.buffer);
  const userDataHash = commUtilsModule.sha256(userData.buffer);
  const userKeysStr = commUtilsModule.base64EncodeBuffer(userKeys.buffer);
  const userDataStr = commUtilsModule.base64EncodeBuffer(userData.buffer);

  const formData = new FormData();
  formData.append('backup_id', backupID);
  formData.append('user_keys_hash', toBase64URL(userKeysHash));
  formData.append('user_keys', userKeysStr);
  formData.append('user_data_hash', toBase64URL(userDataHash));
  formData.append('user_data', userDataStr);
  formData.append('attachments', '');
  return formData;
}

function getBackupAuthorizationHeader(auth: BackupAuth) {
  const authStr = JSON.stringify(auth);
  const authBase64 = base64.encode(authStr);
  return `Bearer ${authBase64}`;
}

async function uploadBackup(backup: BackupEncrypted, auth: BackupAuth) {
  const authHeader = getBackupAuthorizationHeader(auth);

  const uploadBackupEndpoint = backupService.httpEndpoints.UPLOAD_BACKUP;
  const sendBackupResponse = await fetch(
    makeBackupServiceEndpointURL(uploadBackupEndpoint),
    {
      method: uploadBackupEndpoint.method,
      body: getBackupFormData(backup),
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': authHeader,
      },
    },
  );

  if (!sendBackupResponse.ok) {
    const { status, statusText } = sendBackupResponse;
    throw new Error(`Server responded with HTTP ${status}: ${statusText}`);
  }
}

async function getBackupID(username: string): Promise<string> {
  const getBackupIDEndpoint = backupService.httpEndpoints.GET_LATEST_BACKUP_ID;
  const getBackupIDResponse = await fetch(
    makeBackupServiceEndpointURL(getBackupIDEndpoint, { username }),
    {
      method: getBackupIDEndpoint.method,
    },
  );

  if (!getBackupIDResponse.ok) {
    const { status, statusText } = getBackupIDResponse;
    throw new Error(`Server responded with HTTP ${status}: ${statusText}`);
  }

  const { backupID } = await getBackupIDResponse.json();
  return backupID;
}

export { uploadBackup, getBackupID };
