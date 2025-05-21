// @flow

import {
  databaseIdentifier,
  type DatabaseIdentifier,
} from 'lib/types/database-identifier-types.js';
import type { PlatformDetails } from 'lib/types/device-types.js';

import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';

let mainQueryExecutor: ?SQLiteQueryExecutor = null;
let restoredQueryExecutor: ?SQLiteQueryExecutor = null;

function getSQLiteQueryExecutor(
  id: DatabaseIdentifier = databaseIdentifier.MAIN,
): ?SQLiteQueryExecutor {
  if (id === databaseIdentifier.RESTORED) {
    return restoredQueryExecutor;
  }
  return mainQueryExecutor;
}

function setSQLiteQueryExecutor(
  newSQLiteQueryExecutor: ?SQLiteQueryExecutor,
  id: DatabaseIdentifier = databaseIdentifier.MAIN,
) {
  if (id === databaseIdentifier.RESTORED) {
    restoredQueryExecutor = newSQLiteQueryExecutor;
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
