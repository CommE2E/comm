// @flow

import type { UserStore } from './user-types.js';

export type UserKeys = {
  +backupDataKey: string,
  +ed25519: string,
};

export type UserData = {
  +userStore: UserStore,
};

export type BackupAuth = {
  +userID: string,
  +accessToken: string,
  +deviceID: string,
};

export type Backup = {
  +backupID: string,
  +userKeys: UserKeys,
  +userData: UserData,
};

export type BackupEncrypted = {
  +backupID: string,
  +userKeys: Uint8Array,
  +userData: Uint8Array,
};
