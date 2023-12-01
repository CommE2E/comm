// @flow

import base64 from 'base-64';

import backupService from 'lib/facts/backup-service.js';
import type { BackupAuth, BackupEncrypted } from 'lib/types/backup-types.js';
import { makeBackupServiceEndpointURL } from 'lib/utils/backup-service.js';
import { toBase64URL } from 'lib/utils/base64.js';
import { handleHTTPResponseError } from 'lib/utils/services-utils.js';

import { getBackupStringFromBlob } from './conversion-utils.js';
import { commUtilsModule } from '../native-modules.js';

function getBackupFormData(backup: BackupEncrypted): FormData {
  const { backupID, userKeys, userData } = backup;
  const userKeysHash = commUtilsModule.sha256(
    commUtilsModule.encodeStringToUTF8ArrayBuffer(userKeys),
  );
  const userDataHash = commUtilsModule.sha256(
    commUtilsModule.encodeStringToUTF8ArrayBuffer(userData),
  );

  const formData = new FormData();
  formData.append('backup_id', backupID);
  formData.append('user_keys_hash', toBase64URL(userKeysHash));
  formData.append('user_keys', backup.userKeys);
  formData.append('user_data_hash', toBase64URL(userDataHash));
  formData.append('user_data', backup.userData);
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

  handleHTTPResponseError(sendBackupResponse);
}

async function getBackupID(username: string): Promise<string> {
  const getBackupIDEndpoint = backupService.httpEndpoints.GET_LATEST_BACKUP_ID;
  const getBackupIDResponse = await fetch(
    makeBackupServiceEndpointURL(getBackupIDEndpoint, { username }),
    {
      method: getBackupIDEndpoint.method,
    },
  );

  handleHTTPResponseError(getBackupIDResponse);

  const { backupID } = await getBackupIDResponse.json();
  return backupID;
}

async function getUserKeys(
  backupID: string,
  auth: BackupAuth,
): Promise<string> {
  const authHeader = getBackupAuthorizationHeader(auth);

  const getUserKeysEndpoint = backupService.httpEndpoints.GET_USER_KEYS;
  const getUserKeysResponse = await fetch(
    makeBackupServiceEndpointURL(getUserKeysEndpoint, { backupID }),
    {
      method: getUserKeysEndpoint.method,
      headers: {
        Authorization: authHeader,
      },
    },
  );

  handleHTTPResponseError(getUserKeysResponse);

  const blob = await getUserKeysResponse.blob();
  return getBackupStringFromBlob(blob);
}

async function getUserData(
  backupID: string,
  auth: BackupAuth,
): Promise<string> {
  const authHeader = getBackupAuthorizationHeader(auth);

  const getUserDataEndpoint = backupService.httpEndpoints.GET_USER_DATA;
  const getUserDataResponse = await fetch(
    makeBackupServiceEndpointURL(getUserDataEndpoint, { backupID }),
    {
      method: getUserDataEndpoint.method,
      headers: {
        Authorization: authHeader,
      },
    },
  );

  handleHTTPResponseError(getUserDataResponse);

  const blob = await getUserDataResponse.blob();
  return getBackupStringFromBlob(blob);
}

export { uploadBackup, getBackupID, getUserKeys, getUserData };
