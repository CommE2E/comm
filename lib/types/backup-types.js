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
