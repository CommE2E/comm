// @flow

import type { PlatformDetails } from 'lib/types/device-types.js';

import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';

let sqliteQueryExecutor: ?SQLiteQueryExecutor = null;

function getSQLiteQueryExecutor(): ?SQLiteQueryExecutor {
  return sqliteQueryExecutor;
}

function setSQLiteQueryExecutor(newSQLiteQueryExecutor: ?SQLiteQueryExecutor) {
  sqliteQueryExecutor = newSQLiteQueryExecutor;
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
