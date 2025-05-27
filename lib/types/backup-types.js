// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

// This type should match `SIWEBackupData` in
// `native/native_rust_library/src/backup.rs`
export type SIWEBackupData = {
  +siweBackupMsgNonce: string,
  +siweBackupMsgStatement: string,
  +siweBackupMsgIssuedAt: string,
};
export const siweBackupDataValidator: TInterface<SIWEBackupData> =
  tShape<SIWEBackupData>({
    siweBackupMsgNonce: t.String,
    siweBackupMsgStatement: t.String,
    siweBackupMsgIssuedAt: t.String,
  });

// This type should match `BackupVersionInfo` in
// `shared/comm-lib/src/backup/mod.rs`
export type BackupVersionInfo = {
  +codeVersion: number,
  +stateVersion: number,
  +dbVersion: number,
};
export const backupVersionInfoValidator: TInterface<BackupVersionInfo> =
  tShape<BackupVersionInfo>({
    codeVersion: t.Number,
    stateVersion: t.Number,
    dbVersion: t.Number,
  });
// This type should match `LatestBackupInfo` in
// `native/native_rust_library/src/backup.rs`
export type LatestBackupInfo = {
  +backupID: string,
  +userID: string,
  +siweBackupData?: ?SIWEBackupData,
  +keyserverDeviceID?: ?string,
  // ISO 8601 / RFC 3339 DateTime string
  +creationTimestamp: string,
  +totalBackupSize: number,
  +versionInfo: BackupVersionInfo,
};
export const latestBackupInfoResponseValidator: TInterface<LatestBackupInfo> =
  tShape<LatestBackupInfo>({
    backupID: t.String,
    userID: t.String,
    siweBackupData: t.maybe(siweBackupDataValidator),
    keyserverDeviceID: t.maybe(t.String),
    creationTimestamp: t.String,
    totalBackupSize: t.Number,
    versionInfo: backupVersionInfoValidator,
  });

// This type should match `UserKeys` in
// `native/native_rust_library/src/backup.rs`
export type UserKeys = {
  +backupDataKey: string,
  +backupLogDataKey: string,
  +pickleKey: string,
  +pickledAccount: string,
};
export const userKeysResponseValidator: TInterface<UserKeys> = tShape<UserKeys>(
  {
    backupDataKey: t.String,
    backupLogDataKey: t.String,
    pickleKey: t.String,
    pickledAccount: t.String,
  },
);

export type LocalLatestBackupInfo = {
  +backupID: string,
  +timestamp: number,
};

export type BackupStore = {
  +latestBackupInfo: ?LocalLatestBackupInfo,
  +latestDatabaseVersion: number,
};
