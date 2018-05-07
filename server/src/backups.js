// @flow

import fs from 'fs';
import childProcess from 'child_process';
import zlib from 'zlib';
import dateFormat from 'dateformat';

import dbConfig from '../secrets/db_config';
import backupConfig from '../facts/backups';

const backupDirectory = "/Users/ashoat";

async function backupDB() {
  if (!backupConfig || !backupConfig.enabled) {
    return;
  }
  const dateString = dateFormat("yyyy-mm-dd-HH:MM");
  const filename = `${backupConfig.directory}/squadcal.${dateString}.sql.gz`;
  try {
    await backupDBToFile(filename);
  } catch(e) {
    console.log('error!', e);
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

export {
  backupDB,
};
