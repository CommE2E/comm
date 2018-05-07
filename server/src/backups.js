// @flow

import fs from 'fs';
import childProcess from 'child_process';
import zlib from 'zlib';
import dateFormat from 'dateformat';
import denodeify from 'denodeify';

import dbConfig from '../secrets/db_config';
import backupConfig from '../facts/backups';

const readdir = denodeify(fs.readdir);
const lstat = denodeify(fs.lstat);
const unlink = denodeify(fs.unlink);

async function backupDB(retries: number = 2) {
  if (!backupConfig || !backupConfig.enabled) {
    return;
  }
  const dateString = dateFormat("yyyy-mm-dd-HH:MM");
  const filename = `${backupConfig.directory}/squadcal.${dateString}.sql.gz`;
  try {
    await backupDBToFile(filename);
  } catch (e) {
    if (e.code !== "ENOSPC") {
      throw e;
    }
    if (!retries) {
      throw e;
    }
    await deleteOldestBackup();
    await backupDB(retries - 1);
  }
}

function backupDBToFile(filePath: string): Promise<void> {
  const writeStream = fs.createWriteStream(filePath);
  const mysqlDump = childProcess.spawn(
    'mysqldump',
    [
      '-u',
      dbConfig.user,
      `-p${dbConfig.password}`,
      dbConfig.database,
    ],
  );
  return new Promise((resolve, reject) => {
    mysqlDump
      .stdout
      .pipe(zlib.createGzip())
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
  if (oldestFile) {
    await unlink(`${backupConfig.directory}/${oldestFile.file}`);
  }
}

export {
  backupDB,
};
