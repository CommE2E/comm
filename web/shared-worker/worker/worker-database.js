// @flow

import type { PlatformDetails } from 'lib/types/device-types.js';

import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';

let mainQueryExecutor: ?SQLiteQueryExecutor = null;
let backupQueryExecutor: ?SQLiteQueryExecutor = null;

function getSQLiteQueryExecutor(
  databaseID: string = 'main',
): ?SQLiteQueryExecutor {
  if (databaseID === 'backup') {
    return backupQueryExecutor;
  }
  return mainQueryExecutor;
}

function setSQLiteQueryExecutor(
  newSQLiteQueryExecutor: ?SQLiteQueryExecutor,
  databaseID: string = 'main',
) {
  if (databaseID === 'backup') {
    backupQueryExecutor = newSQLiteQueryExecutor;
    return;
  }
  mainQueryExecutor = newSQLiteQueryExecutor;
}

let dbModule: ?EmscriptenModule = null;

function getDBModule(): ?EmscriptenModule {
  return dbModule;
}

function setDBModule(newDBModule: EmscriptenModule) {
  dbModule = newDBModule;
}

let platformDetails: ?PlatformDetails = null;

function getPlatformDetails(): ?PlatformDetails {
  return platformDetails;
}

function setPlatformDetails(newPlatformDetails: PlatformDetails) {
  platformDetails = newPlatformDetails;
}

export {
  getSQLiteQueryExecutor,
  setSQLiteQueryExecutor,
  getDBModule,
  setDBModule,
  getPlatformDetails,
  setPlatformDetails,
};
