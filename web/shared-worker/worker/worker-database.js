// @flow

import {
  databaseIdentifier,
  type DatabaseIdentifier,
} from 'lib/types/database-identifier-types.js';
import type { PlatformDetails } from 'lib/types/device-types.js';

import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutorWrapper } from '../utils/sql-query-executor-wrapper.js';

let mainQueryExecutor: ?SQLiteQueryExecutorWrapper = null;
let restoredQueryExecutor: ?SQLiteQueryExecutorWrapper = null;

function getSQLiteQueryExecutor(
  id: DatabaseIdentifier = databaseIdentifier.MAIN,
): ?SQLiteQueryExecutorWrapper {
  if (id === databaseIdentifier.RESTORED) {
    return restoredQueryExecutor;
  }
  return mainQueryExecutor;
}

function setSQLiteQueryExecutor(
  newSQLiteQueryExecutor: ?SQLiteQueryExecutorWrapper,
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
