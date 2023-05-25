// @flow

import type { SqliteDatabase } from 'sql.js';

import { migrations } from '../utils/migrations.js';

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

function setSQLiteDBVersion(db: SqliteDatabase, version: number) {
  db.exec(`PRAGMA user_version=${version};`);
}

function setupSQLiteDB(db: SqliteDatabase) {
  db.exec(`
     CREATE TABLE IF NOT EXISTS drafts (
       key TEXT UNIQUE PRIMARY KEY NOT NULL,
       text TEXT NOT NULL
     );
     
     CREATE TABLE IF NOT EXISTS metadata (
       name TEXT UNIQUE PRIMARY KEY NOT NULL,
       data TEXT NOT NULL
     );
     
     CREATE TABLE IF NOT EXISTS persist_storage (
       key TEXT UNIQUE PRIMARY KEY NOT NULL,
       item TEXT NOT NULL
     );
  `);
  const migrationKeys = migrations.size ? migrations.keys() : [0];
  const newDatabaseVersion = Math.max(...migrationKeys);
  setSQLiteDBVersion(db, newDatabaseVersion);
}

function migrate(sqliteDb: SqliteDatabase): boolean {
  const dbVersion = getSQLiteDBVersion(sqliteDb);
  console.info(`Db version: ${dbVersion}`);

  for (const [idx, migration] of migrations.entries()) {
    if (idx <= dbVersion) {
      continue;
    }

    try {
      migration(sqliteDb);
      console.log(`migration ${idx} succeeded.`);
      setSQLiteDBVersion(sqliteDb, idx);
    } catch (e) {
      console.error(`migration ${idx} failed.`);
      console.error(e);
      return false;
    }
  }
  return true;
}

export { getSQLiteDBVersion, setupSQLiteDB, setSQLiteDBVersion, migrate };
