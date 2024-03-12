// @flow

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

export {
  getSQLiteQueryExecutor,
  setSQLiteQueryExecutor,
  getDBModule,
  setDBModule,
};
