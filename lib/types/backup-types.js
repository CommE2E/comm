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

type LocalLatestBakupInfo = {
  +backupID: string,
  +timestamp: number,
};

export type BackupStore = {
  latestBackupInfo: ?LocalLatestBakupInfo,
};
