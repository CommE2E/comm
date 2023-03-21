// @flow

import type { SqliteDatabase } from 'sql.js';

function getSQLiteDBVersion(db: SqliteDatabase): number {
  const versionData = db.exec('PRAGMA user_version;');
  if (!versionData.length || !versionData[0].values.length) {
    throw new Error('Error while retrieving database version: empty result');
  }
  const [dbVersion] = versionData[0].values[0];
  if (typeof dbVersion !== 'number') {
    throw new Error(
      'Error while retrieving database version: invalid type returned',
    );
  }
  return dbVersion;
}

function setupSQLiteDB(db: SqliteDatabase) {
  db.exec(`
     CREATE TABLE IF NOT EXISTS drafts (
       key TEXT UNIQUE PRIMARY KEY NOT NULL,
       text TEXT NOT NULL
     )
  `);
}

export { getSQLiteDBVersion, setupSQLiteDB };
