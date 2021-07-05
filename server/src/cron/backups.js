// @flow

import childProcess from 'child_process';
import dateFormat from 'dateformat';
import fs from 'fs';
import invariant from 'invariant';
import { ReReadable } from 'rereadable-stream';
import { promisify } from 'util';
import zlib from 'zlib';

import dbConfig from '../../secrets/db_config';

const readdir = promisify(fs.readdir);
const lstat = promisify(fs.lstat);
const unlink = promisify(fs.unlink);

let importedBackupConfig = undefined;
async function importBackupConfig() {
  if (importedBackupConfig !== undefined) {
    return importedBackupConfig;
  }
  try {
    // $FlowFixMe
    const backupExports = await import('../../facts/backups');
    if (importedBackupConfig === undefined) {
      importedBackupConfig = backupExports.default;
    }
  } catch {
    if (importedBackupConfig === undefined) {
      importedBackupConfig = null;
    }
  }
  return importedBackupConfig;
}

async function backupDB() {
  const backupConfig = await importBackupConfig();
  if (!backupConfig || !backupConfig.enabled) {
    return;
  }

  const dateString = dateFormat('yyyy-mm-dd-HH:MM');
  const filename = `comm.${dateString}.sql.gz`;
  const filePath = `${backupConfig.directory}/${filename}`;

  const mysqlDump = childProcess.spawn(
    'mysqldump',
    [
      '-u',
      dbConfig.user,
      `-p${dbConfig.password}`,
      '--single-transaction',
      dbConfig.database,
    ],
    {
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  );
  const cache = new ReReadable();
  mysqlDump.on('error', (e: Error) => {
    console.warn(`error trying to spawn mysqldump for ${filename}`, e);
  });
  mysqlDump.on('exit', (code: number | null, signal: string | null) => {
    if (signal !== null && signal !== undefined) {
      console.warn(`mysqldump received signal ${signal} for ${filename}`);
    } else if (code !== null && code !== 0) {
      console.warn(`mysqldump exited with code ${code} for ${filename}`);
    }
  });
  mysqlDump.stdout
    .on('error', (e: Error) => {
      console.warn(`mysqldump stdout stream emitted error for ${filename}`, e);
    })
    .pipe(zlib.createGzip())
    .on('error', (e: Error) => {
      console.warn(`gzip transform stream emitted error for ${filename}`, e);
    })
    .pipe(cache);

  try {
    await saveBackup(filename, filePath, cache);
  } catch (e) {
    console.warn(`saveBackup threw for ${filename}`, e);
    await unlink(filePath);
  }
}

async function saveBackup(
  filename: string,
  filePath: string,
  cache: ReReadable,
  retries: number = 2,
): Promise<void> {
  try {
    await trySaveBackup(filename, filePath, cache);
  } catch (e) {
    if (e.code !== 'ENOSPC') {
      throw e;
    }
    if (!retries) {
      throw e;
    }
    await deleteOldestBackup();
    await saveBackup(filename, filePath, cache, retries - 1);
  }
}

const backupWatchFrequency = 60 * 1000;
function trySaveBackup(
  filename: string,
  filePath: string,
  cache: ReReadable,
): Promise<void> {
  const timeoutObject: {| timeout: ?TimeoutID |} = { timeout: null };
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

  const writeStream = fs.createWriteStream(filePath);
  return new Promise((resolve, reject) => {
    cache
      .rewind()
      .pipe(writeStream)
      .on('finish', () => {
        clearTimeout(timeoutObject.timeout);
        resolve();
      })
      .on('error', (e: Error) => {
        clearTimeout(timeoutObject.timeout);
        console.warn(`write stream emitted error for ${filename}`, e);
        reject(e);
      });
  });
}

async function deleteOldestBackup() {
  const backupConfig = await importBackupConfig();
  invariant(backupConfig, 'backupConfig should be non-null');
  const files = await readdir(backupConfig.directory);
  let oldestFile;
  for (const file of files) {
    if (!file.endsWith('.sql.gz') || !file.startsWith('comm.')) {
      continue;
    }
    const stat = await lstat(`${backupConfig.directory}/${file}`);
    if (stat.isDirectory()) {
      continue;
    }
    if (!oldestFile || stat.mtime < oldestFile.mtime) {
      oldestFile = { file, mtime: stat.mtime };
    }
  }
  if (!oldestFile) {
    return;
  }
  try {
    await unlink(`${backupConfig.directory}/${oldestFile.file}`);
  } catch (e) {
    // Check if it's already been deleted
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}

export { backupDB };
