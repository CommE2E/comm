// @flow

import invariant from 'invariant';

import { importJSON } from '../utils/import-json';

export type DBConfig = {
  +host: string,
  +user: string,
  +password: string,
  +database: string,
  +dbType: 'mysql5.7' | 'mariadb10.8',
};

let dbConfig;
async function getDBConfig(): Promise<DBConfig> {
  if (dbConfig !== undefined) {
    return dbConfig;
  }
  if (
    process.env.COMM_DATABASE_DATABASE &&
    process.env.COMM_DATABASE_USER &&
    process.env.COMM_DATABASE_PASSWORD
  ) {
    dbConfig = {
      host: process.env.COMM_DATABASE_HOST || 'localhost',
      user: process.env.COMM_DATABASE_USER,
      password: process.env.COMM_DATABASE_PASSWORD,
      database: process.env.COMM_DATABASE_DATABASE,
      dbType:
        process.env.COMM_DATABASE_TYPE === 'mariadb10.8'
          ? 'mariadb10.8'
          : 'mysql5.7',
    };
  } else {
    const importedDBConfig = await importJSON({
      folder: 'secrets',
      name: 'db_config',
    });
    invariant(importedDBConfig, 'DB config missing');
    dbConfig = {
      ...importedDBConfig,
      dbType:
        importedDBConfig.dbType === 'mariadb10.8' ? 'mariadb10.8' : 'mysql5.7',
    };
  }
  return dbConfig;
}

export { getDBConfig };
