// @flow

import backupService from 'lib/facts/backup-service.js';
import { decryptCommon } from 'lib/media/aes-crypto-utils-common.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import { syncedMetadataNames } from 'lib/types/synced-metadata-types.js';
import { runMigrations } from 'lib/utils/migration-utils.js';

import { getProcessingStoreOpsExceptionMessage } from './process-operations.js';
import {
  BackupClient,
  RequestedData,
} from '../../backup-client-wasm/wasm/backup-client-wasm.js';
import { defaultWebState } from '../../redux/default-state.js';
import { legacyMigrations, migrations } from '../../redux/migrations.js';
import {
  completeRootKey,
  storeVersion,
} from '../../redux/persist-constants.js';
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

  try {
    const reduxPersistData =
      sqliteQueryExecutor.getPersistStorageItem(completeRootKey);

    sqliteQueryExecutor.restoreFromMainCompaction(
      COMM_SQLITE_BACKUP_RESTORE_DATABASE_PATH,
      backupDataKey,
    );

    const backupVersion = getStoredVersion(sqliteQueryExecutor);
    if (!backupVersion || parseInt(backupVersion) > (storeVersion ?? 0)) {
      throw new Error(`Incompatible backup version ${backupVersion ?? -1}`);
    }

    sqliteQueryExecutor.setPersistStorageItem(
      completeRootKey,
      reduxPersistData,
    );
  } catch (err) {
    throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
  }

  await client.downloadLogs(userIdentity, backupID, async log => {
    const content = await decryptCommon(crypto, decryptionKey, log);
    try {
      sqliteQueryExecutor.restoreFromBackupLog(content);
    } catch (err) {
      throw new Error(getProcessingStoreOpsExceptionMessage(err, dbModule));
    }
  });

  const versionAfterLogsDownload = getStoredVersion(sqliteQueryExecutor);
  if (!versionAfterLogsDownload) {
    throw new Error('Missing backup version after log download');
  }
  const versionNumberAfterLogsDownload = parseInt(versionAfterLogsDownload);
  await runMigrations(
    legacyMigrations,
    migrations,
    {
      ...defaultWebState,
      _persist: {
        version: versionNumberAfterLogsDownload,
        rehydrated: true,
      },
    },
    versionNumberAfterLogsDownload,
    storeVersion,
    process.env.NODE_ENV !== 'production',
  );
}

function getStoredVersion(sqliteQueryExecutor: SQLiteQueryExecutor) {
  return sqliteQueryExecutor
    .getAllSyncedMetadata()
    .find(entry => entry.name === syncedMetadataNames.DB_VERSION)?.data;
}

export { restoreBackup };
