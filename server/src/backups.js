// @flow

import fs from 'fs';
import childProcess from 'child_process';
import zlib from 'zlib';
import dateFormat from 'dateformat';
import denodeify from 'denodeify';
import StreamCache from 'stream-cache';

import dbConfig from '../secrets/db_config';
import backupConfig from '../facts/backups';

const readdir = denodeify(fs.readdir);
const lstat = denodeify(fs.lstat);
const unlink = denodeify(fs.unlink);

async function backupDB(retries: number = 2) {
  if (!backupConfig || !backupConfig.enabled) {
    return;
  }

  const mysqlDump = childProcess.spawn(
    'mysqldump',
    [
      '-u',
      dbConfig.user,
      `-p${dbConfig.password}`,
      dbConfig.database,
    ],
    {
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  );
  const cache = new StreamCache();
  mysqlDump
    .stdout
    .pipe(zlib.createGzip())
    .pipe(cache);

  const dateString = dateFormat("yyyy-mm-dd-HH:MM");
  const filename = `${backupConfig.directory}/squadcal.${dateString}.sql.gz`;

  await saveBackup(filename, cache);
}

async function saveBackup(
  filePath: string,
  cache: StreamCache,
  retries: number = 2,
): Promise<void> {
  try {
    await trySaveBackup(filePath, cache);
  } catch (e) {
    if (e.code !== "ENOSPC") {
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
  const files = await readdir(backupConfig.directory);
  let oldestFile;
  for (let file of files) {
    if (!file.endsWith(".sql.gz")) {
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
    if (e.code !== "ENOENT") {
      throw e;
    }
  }
}

export {
  backupDB,
};
