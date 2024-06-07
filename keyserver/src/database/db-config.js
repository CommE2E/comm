// @flow

import invariant from 'invariant';

import { getCommConfig } from 'lib/utils/comm-config.js';

export type DBConfig = {
  +host: string,
  +user: string,
  +password: string,
  +database: string,
  +port?: number,
};

let dbConfig;
async function getDBConfig(): Promise<DBConfig> {
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
      port: Number(process.env.COMM_DATABASE_PORT) || 3306,
    };
  } else {
    const importedDBConfig = await getCommConfig<DBConfig>({
      folder: 'secrets',
      name: 'db_config',
    });
    invariant(importedDBConfig, 'DB config missing');

    dbConfig = importedDBConfig;
  }
  return dbConfig;
}

export { getDBConfig };
