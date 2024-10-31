// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

// This type should match `BackupKeysResult` in
// `native/native_rust_library/src/backup.rs`
export type BackupKeys = {
  +backupID: string,
  +backupDataKey: string,
  +backupLogDataKey: string,
};
export const backupKeysValidator: TInterface<BackupKeys> = tShape<BackupKeys>({
  backupID: t.String,
  backupDataKey: t.String,
  backupLogDataKey: t.String,
});

// This type should match `SIWEBackupData` in
// `native/native_rust_library/src/backup.rs`
export type SIWEBackupData = {
  +backupID: string,
  +siweBackupMsgNonce: string,
  +siweBackupMsgStatement: string,
  +siweBackupMsgIssuedAt: string,
};
export const siweBackupDataValidator: TInterface<SIWEBackupData> =
  tShape<SIWEBackupData>({
    backupID: t.String,
    siweBackupMsgNonce: t.String,
    siweBackupMsgStatement: t.String,
    siweBackupMsgIssuedAt: t.String,
  });

// This type should match `LatestBackupInfo` in
// `native/native_rust_library/src/backup.rs`
export type LatestBackupInfo = {
  +backupID: string,
  +userID: string,
  +siweBackupData?: ?SIWEBackupData,
};
export const latestBackupInfoResponseValidator: TInterface<LatestBackupInfo> =
  tShape<LatestBackupInfo>({
    backupID: t.String,
    userID: t.String,
    siweBackupData: t.maybe(siweBackupDataValidator),
  });
