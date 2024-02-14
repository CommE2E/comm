// @flow

import { BackupClient, RequestedData } from 'backup-client-wasm';

import backupService from 'lib/facts/backup-service.js';
import { decryptCommon } from 'lib/media/aes-crypto-utils-common.js';
import { removeDeviceSpecificInfoFromDBKeyserverStoreOps } from 'lib/ops/keyserver-store-ops.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';

import { processKeyserverStoreOperations } from './process-operations.js';
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
  backupLogDataKey: string,
) {
  const decryptionKey = new TextEncoder().encode(backupLogDataKey);
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

  const keyservers = sqliteQueryExecutor.getAllKeyservers();
  const operations =
    removeDeviceSpecificInfoFromDBKeyserverStoreOps(keyservers);
  processKeyserverStoreOperations(sqliteQueryExecutor, operations, dbModule);

  await client.downloadLogs(userIdentity, backupID, async log => {
    const content = await decryptCommon(crypto, decryptionKey, log);
    sqliteQueryExecutor.restoreFromBackupLog(content);
  });
}

export { restoreBackup };
