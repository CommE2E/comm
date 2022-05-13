// @flow

import invariant from 'invariant';

import { importJSON } from '../utils/import-json';

export type DBConfig = {
  +host: string,
  +user: string,
  +password: string,
  +database: string,
};

let dbConfig;
async function getDBConfig(): Promise<DBConfig> {
  if (dbConfig !== undefined) {
    return dbConfig;
  }
  if (
    process.env.COMM_MYSQL_DATABASE &&
    process.env.COMM_MYSQL_USER &&
    process.env.COMM_MYSQL_PASSWORD
  ) {
    dbConfig = {
      host: process.env.COMM_MYSQL_HOST || 'localhost',
      user: process.env.COMM_MYSQL_USER,
      password: process.env.COMM_MYSQL_PASSWORD,
      database: process.env.COMM_MYSQL_DATABASE,
    };
  } else {
    const importedDBConfig = await importJSON('secrets/db_config');
    invariant(importedDBConfig, 'DB config missing');
    dbConfig = importedDBConfig;
  }
  return dbConfig;
}

export { getDBConfig };
