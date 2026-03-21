// @flow

import childProcess from 'child_process';
import dateFormat from 'dateformat';
import { PassThrough, pipeline as streamPipeline } from 'stream';
import { promisify } from 'util';
import zlib from 'zlib';

import { getCommConfig } from 'lib/utils/comm-config.js';

import { runBackup } from '../backups/backup-runner.js';
import {
  createBackupStorageAdapter,
  type StorageConfig,
} from '../backups/backup-storage.js';
import { getDBConfig, type DBConfig } from '../database/db-config.js';

const pipeline = promisify(streamPipeline);

type BackupConfig = {
  +enabled: boolean,
  +storage: StorageConfig,
  +maxDirSizeMiB?: ?number,
};

function getBackupConfig(): Promise<?BackupConfig> {
  return getCommConfig({ folder: 'secrets', name: 'backups' });
}

async function backupDB() {
  const [backupConfig, dbConfig] = await Promise.all([
    getBackupConfig(),
    getDBConfig(),
  ]);

  if (!backupConfig || !backupConfig.enabled) {
    return;
  }

  const dateString = dateFormat('yyyy-mm-dd-HH:MM');
  const filename = `comm.${dateString}.sql.gz`;
  const storageAdapter = createBackupStorageAdapter(backupConfig.storage);

  await runBackup({
    jobName: 'comm',
    filename,
    filenamePrefix: 'comm.',
    filenameSuffix: '.sql.gz',
    storageAdapter,
    maxDirSizeMiB: backupConfig.maxDirSizeMiB,
    writeBackup(writeStream) {
      return writeDatabaseBackup(dbConfig, filename, writeStream);
    },
  });
}

function mysqldump(
  dbConfig: DBConfig,
  filename: string,
  rawStream: PassThrough,
  extraParams: $ReadOnlyArray<string>,
  pipeParams?: { end?: boolean, ... },
): Promise<void> {
  const params = [
    '-h',
    dbConfig.host,
    '-u',
    dbConfig.user,
    `-p${dbConfig.password}`,
  ];
  if (dbConfig.port) {
    params.push('-P', String(dbConfig.port));
  }
  params.push(
    '--single-transaction',
    '--no-tablespaces',
    '--default-character-set=utf8mb4',
    '--net-buffer-length=523264',
    '--max-allowed-packet=256M',
    ...extraParams,
    dbConfig.database,
  );
  const mysqlDump = childProcess.spawn('mysqldump', params, {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const extraParamsString = extraParams.join(' ');
  return new Promise((resolve, reject) => {
    mysqlDump.on('error', (e: Error) => {
      console.warn(
        `error trying to spawn mysqldump ${extraParamsString} for ${filename}`,
        e,
      );
      reject(e);
    });
    mysqlDump.on('exit', (code: number | null, signal: string | null) => {
      if (signal !== null && signal !== undefined) {
        console.warn(
          `mysqldump ${extraParamsString} received signal ${signal} for ` +
            filename,
        );
        reject(new Error(`mysqldump ${JSON.stringify({ code, signal })}`));
      } else if (code !== null && code !== 0) {
        console.warn(
          `mysqldump ${extraParamsString} exited with code ${code} for ` +
            filename,
        );
        reject(new Error(`mysqldump ${JSON.stringify({ code, signal })}`));
      }
      resolve();
    });
    mysqlDump.stdout.pipe(rawStream, pipeParams);
  });
}

async function writeDatabaseBackup(
  dbConfig: DBConfig,
  filename: string,
  writeStream: stream$Writable,
): Promise<void> {
  const rawStream = new PassThrough();
  const gzipStream = zlib.createGzip();
  rawStream.on('error', (e: Error) => {
    console.warn(`mysqldump stdout stream emitted error for ${filename}`, e);
  });
  gzipStream.on('error', (e: Error) => {
    console.warn(`gzip transform stream emitted error for ${filename}`, e);
  });

  const dumpPromise = (async () => {
    try {
      await mysqldump(dbConfig, filename, rawStream, ['--no-data'], {
        end: false,
      });
    } catch (firstDumpError) {
      console.warn(
        `mysqldump --no-data failed for ${filename}; ` +
          'continuing with data-only backup',
        firstDumpError,
      );
    }
    const ignoreReports = `--ignore-table=${dbConfig.database}.reports`;
    try {
      await mysqldump(dbConfig, filename, rawStream, [
        '--no-create-info',
        ignoreReports,
      ]);
    } catch (error) {
      rawStream.destroy(error);
      throw error;
    }
  })();

  try {
    try {
      await pipeline(rawStream, gzipStream, writeStream);
    } catch (error) {
      try {
        await dumpPromise;
      } catch {}
      throw error;
    }
    await dumpPromise;
  } finally {
    rawStream.destroy();
  }
}

export { backupDB };
