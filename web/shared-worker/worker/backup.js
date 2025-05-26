// @flow

import backupService from 'lib/facts/backup-service.js';
import { decryptCommon } from 'lib/media/aes-crypto-utils-common.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import { databaseIdentifier } from 'lib/types/database-identifier-types.js';

import { getProcessingStoreOpsExceptionMessage } from './process-operations.js';
import { setSQLiteQueryExecutor } from './worker-database.js';
import {
  BackupClient,
  RequestedData,
} from '../../backup-client-wasm/wasm/backup-client-wasm.js';
import {
  completeRootKey,
  storeVersion,
} from '../../redux/persist-constants.js';
import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import {
  ENCRYPTED_SQLITE_RESTORE_DATABASE_PATH,
  SQLITE_RESTORE_DATABASE_PATH,
} from '../utils/constants.js';
import { importDatabaseContent } from '../utils/db-utils.js';

async function restoreBackup(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
  authMetadata: AuthMetadata,
  backupID: string,
  backupDataKey: string,
  backupLogDataKey: string,
): Promise<void> {
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
    ENCRYPTED_SQLITE_RESTORE_DATABASE_PATH,
  );

  try {
    const reduxPersistData =
      sqliteQueryExecutor.getPersistStorageItem(completeRootKey);

    dbModule.SQLiteBackup.restoreFromMainCompaction(
      ENCRYPTED_SQLITE_RESTORE_DATABASE_PATH,
      backupDataKey,
      SQLITE_RESTORE_DATABASE_PATH,
      `${storeVersion ?? -1}`,
    );

    const restoredQueryExecutor = new dbModule.SQLiteQueryExecutor(
      SQLITE_RESTORE_DATABASE_PATH,
      true,
    );

    setSQLiteQueryExecutor(restoredQueryExecutor, databaseIdentifier.RESTORED);

    sqliteQueryExecutor.setPersistStorageItem(
      completeRootKey,
      reduxPersistData,
    );

    await client.downloadLogs(userIdentity, backupID, async log => {
      const content = await decryptCommon(crypto, decryptionKey, log);
      restoredQueryExecutor.restoreFromBackupLog(content);
    });
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }
}

export { restoreBackup };
