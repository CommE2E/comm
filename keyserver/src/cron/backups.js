// @flow

import childProcess from 'child_process';
import dateFormat from 'dateformat';
import fs from 'fs';
import invariant from 'invariant';
import { PassThrough, pipeline as streamPipeline } from 'stream';
import { promisify } from 'util';
import zlib from 'zlib';

import { getCommConfig } from 'lib/utils/comm-config.js';

import { getDBConfig, type DBConfig } from '../database/db-config.js';

const readdir = promisify(fs.readdir);
const lstat = promisify(fs.lstat);
const unlink = promisify(fs.unlink);
const pipeline = promisify(streamPipeline);

type BackupConfig = {
  +enabled: boolean,
  +directory: string,
  +maxDirSizeMiB?: ?number,
};

function getBackupConfig(): Promise<?BackupConfig> {
  return getCommConfig({ folder: 'facts', name: 'backups' });
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
  const filePath = `${backupConfig.directory}/${filename}`;

  try {
    await saveBackup(dbConfig, filename, filePath);
  } catch (e) {
    console.warn(`saveBackup threw for ${filename}`, e);
    try {
      await unlink(filePath);
    } catch (deleteError) {
      if (deleteError.code !== 'ENOENT') {
        throw deleteError;
      }
    }
  }

  await deleteOldBackupsIfSpaceExceeded();
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

async function saveBackup(
  dbConfig: DBConfig,
  filename: string,
  filePath: string,
  retries: number = 2,
): Promise<void> {
  try {
    await trySaveBackup(dbConfig, filename, filePath);
  } catch (saveError) {
    if (saveError.code !== 'ENOSPC') {
      throw saveError;
    }
    if (!retries) {
      throw saveError;
    }
    try {
      await deleteOldestBackup();
    } catch (deleteError) {
      if (deleteError.message === 'no_backups_left') {
        throw saveError;
      } else {
        throw deleteError;
      }
    }
    await saveBackup(dbConfig, filename, filePath, retries - 1);
  }
}

const backupWatchFrequency = 60 * 1000;
async function trySaveBackup(
  dbConfig: DBConfig,
  filename: string,
  filePath: string,
): Promise<void> {
  const timeoutObject: { timeout: ?TimeoutID } = { timeout: null };
  const setBackupTimeout = (alreadyWaited: number) => {
    timeoutObject.timeout = setTimeout(() => {
      const nowWaited = alreadyWaited + backupWatchFrequency;
      console.log(
        `writing backup for ${filename} has taken ${nowWaited}ms so far`,
      );
      setBackupTimeout(nowWaited);
    }, backupWatchFrequency);
  };
  setBackupTimeout(0);

  const rawStream = new PassThrough();
  const gzipStream = zlib.createGzip();
  const writeStream = fs.createWriteStream(filePath);
  rawStream.on('error', (e: Error) => {
    console.warn(`mysqldump stdout stream emitted error for ${filename}`, e);
  });
  gzipStream.on('error', (e: Error) => {
    console.warn(`gzip transform stream emitted error for ${filename}`, e);
  });
  writeStream.on('error', (e: Error) => {
    console.warn(`write stream emitted error for ${filename}`, e);
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
    clearTimeout(timeoutObject.timeout);
  }
}

async function deleteOldestBackup() {
  const sortedBackupInfos = await getSortedBackupInfos();
  if (sortedBackupInfos.length === 0) {
    throw new Error('no_backups_left');
  }
  const oldestFilename = sortedBackupInfos[0].filename;
  await deleteBackup(oldestFilename);
}

async function deleteBackup(filename: string) {
  const backupConfig = await getBackupConfig();
  invariant(backupConfig, 'backupConfig should be non-null');
  try {
    await unlink(`${backupConfig.directory}/${filename}`);
  } catch (e) {
    // Check if it's already been deleted
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}

type BackupInfo = {
  +filename: string,
  +lastModifiedTime: number,
  +bytes: number,
};
async function getSortedBackupInfos(): Promise<BackupInfo[]> {
  const backupConfig = await getBackupConfig();
  invariant(backupConfig, 'backupConfig should be non-null');

  const filenames = await readdir(backupConfig.directory);
  const backups = await Promise.all(
    filenames.map(async filename => {
      if (!filename.startsWith('comm.') || !filename.endsWith('.sql.gz')) {
        return null;
      }
      const stats = await lstat(`${backupConfig.directory}/${filename}`);
      if (stats.isDirectory()) {
        return null;
      }
      return {
        filename,
        lastModifiedTime: stats.mtime,
        bytes: stats.size,
      };
    }),
  );

  const filteredBackups = backups.filter(Boolean);
  filteredBackups.sort((a, b) => a.lastModifiedTime - b.lastModifiedTime);
  return filteredBackups;
}

async function deleteOldBackupsIfSpaceExceeded() {
  const backupConfig = await getBackupConfig();
  invariant(backupConfig, 'backupConfig should be non-null');
  const { maxDirSizeMiB } = backupConfig;
  if (!maxDirSizeMiB) {
    return;
  }

  const sortedBackupInfos = await getSortedBackupInfos();
  const mostRecentBackup = sortedBackupInfos.pop();
  if (!mostRecentBackup) {
    return;
  }
  let bytesLeft = maxDirSizeMiB * 1024 * 1024 - mostRecentBackup.bytes;

  const deleteBackupPromises = [];
  for (let i = sortedBackupInfos.length - 1; i >= 0; i--) {
    const backupInfo = sortedBackupInfos[i];
    bytesLeft -= backupInfo.bytes;
    if (bytesLeft <= 0) {
      deleteBackupPromises.push(deleteBackup(backupInfo.filename));
    }
  }
  await Promise.all(deleteBackupPromises);
}

export { backupDB };
