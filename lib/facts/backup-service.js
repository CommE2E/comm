// @flow

export type BackupServiceHTTPEndpoint = {
  +path: string,
  +method: 'GET' | 'POST',
};

const httpEndpoints = Object.freeze({
  // endpoints with auth
  UPLOAD_BACKUP: {
    path: '/backups',
    method: 'POST',
  },
  GET_USER_KEYS_AUTH: {
    path: '/backups/:backup_id/user_keys',
    method: 'GET',
  },
  GET_USER_DATA: {
    path: '/backups/:backup_id/user_data',
    method: 'GET',
  },
  // endpoints without auth
  GET_BACKUP_ID: {
    path: '/backups/latest/:username/backup_id',
    method: 'GET',
  },
  GET_USER_KEYS: {
    path: '/backups/latest/:username/user_keys',
    method: 'GET',
  },
});

const config = {
  url: 'http://localhost:50052',
  httpEndpoints,
};

export default config;
