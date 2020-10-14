// @flow

import fs from 'fs';
import childProcess from 'child_process';
import zlib from 'zlib';
import dateFormat from 'dateformat';
import StreamCache from 'stream-cache';
import { promisify } from 'util';
import invariant from 'invariant';

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
  const cache = new StreamCache();
  mysqlDump.stdout.pipe(zlib.createGzip()).pipe(cache);

  const dateString = dateFormat('yyyy-mm-dd-HH:MM');
  const filename = `${backupConfig.directory}/squadcal.${dateString}.sql.gz`;

  try {
    await saveBackup(filename, cache);
  } catch (e) {
    await unlink(filename);
  }
}

async function saveBackup(
  filePath: string,
  cache: StreamCache,
  retries: number = 2,
): Promise<void> {
  try {
    await trySaveBackup(filePath, cache);
  } catch (e) {
    if (e.code !== 'ENOSPC') {
      throw e;
    }
    if (!retries) {
      throw e;
    }
    await deleteOldestBackup();
    await saveBackup(filePath, cache, retries - 1);
  }
}

function trySaveBackup(filePath: string, cache: StreamCache): Promise<void> {
  const writeStream = fs.createWriteStream(filePath);
  return new Promise((resolve, reject) => {
    cache
      .pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  });
}

async function deleteOldestBackup() {
  const backupConfig = await importBackupConfig();
  invariant(backupConfig, 'backupConfig should be non-null');
  const files = await readdir(backupConfig.directory);
  let oldestFile;
  for (let file of files) {
    if (!file.endsWith('.sql.gz') || !file.startsWith('squadcal.')) {
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
