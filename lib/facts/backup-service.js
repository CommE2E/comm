// @flow

type BackupServiceEndpointPath =
  | '/backups'
  | '/backups/:backupID/user_keys'
  | '/backups/:backupID/user_data'
  | '/backups/latest/:username/backup_id'
  | '/backups/latest/:username/user_keys';

export type BackupServiceHTTPEndpoint = {
  +path: BackupServiceEndpointPath,
  +method: 'GET' | 'POST',
};

const httpEndpoints = Object.freeze({
  // endpoints with auth
  UPLOAD_BACKUP: {
    path: '/backups',
    method: 'POST',
  },
  GET_USER_KEYS: {
    path: '/backups/:backupID/user_keys',
    method: 'GET',
  },
  GET_USER_DATA: {
    path: '/backups/:backupID/user_data',
    method: 'GET',
  },
  // endpoints without auth
  GET_LATEST_BACKUP_ID: {
    path: '/backups/latest/:username/backup_id',
    method: 'GET',
  },
  GET_LATEST_USER_KEYS: {
    path: '/backups/latest/:username/user_keys',
    method: 'GET',
  },
});

const config = {
  url: 'http://localhost:50052',
  httpEndpoints,
};

export default config;
