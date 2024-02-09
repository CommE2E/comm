// @flow

import { BackupClient, RequestedData } from 'backup-client';

import backupService from 'lib/facts/backup-service.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';

import { completeRootKey } from '../../redux/persist-constants.js';
import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { COMM_SQLITE_BACKUP_RESTORE_DATABASE_PATH } from '../utils/constants.js';
import { importDatabaseContent } from '../utils/db-utils.js';

async function restoreBackup(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
  authMetadata: AuthMetadata,
  backupID: string,
  backupDataKey: string,
) {
  const { userID, deviceID, accessToken } = authMetadata;
  if (!userID || !deviceID || !accessToken) {
    throw new Error('Backup restore requires full authMetadata');
  }
  const userIdentity = { userID, deviceID, accessToken };

  const client = new BackupClient(backupService.url);
  const result = await client.downloadBackupData(
    {
      type: 'BackupID',
      backupID,
      userIdentity,
    },
    RequestedData.UserData,
  );

  importDatabaseContent(
    result,
    dbModule,
    COMM_SQLITE_BACKUP_RESTORE_DATABASE_PATH,
  );

  const reduxPersistData =
    sqliteQueryExecutor.getPersistStorageItem(completeRootKey);

  sqliteQueryExecutor.restoreFromMainCompaction(
    COMM_SQLITE_BACKUP_RESTORE_DATABASE_PATH,
    backupDataKey,
  );

  sqliteQueryExecutor.setPersistStorageItem(completeRootKey, reduxPersistData);
}

export { restoreBackup };
