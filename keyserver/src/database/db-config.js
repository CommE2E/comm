// @flow

import invariant from 'invariant';

import { getCommConfig } from 'lib/utils/comm-config.js';

type DBType = 'mariadb10.8';
export type DBConfig = {
  +host: string,
  +user: string,
  +password: string,
  +database: string,
  +dbType: DBType,
};

function assertValidDBType(dbType: ?string): DBType {
  invariant(
    dbType,
    'dbType not specified in DB config. Following the MySQL deprecation this ' +
      'is a required parameter. Please follow this Gist to migrate to ' +
      'MariaDB: ' +
      'https://gist.github.com/Ashoat/3a5ded2549db082c5516606f3c3c5da5',
  );
  invariant(
    dbType !== 'mysql5.7',
    'We no longer support MySQL. Please follow this Gist to migrate to ' +
      'MariaDB: ' +
      'https://gist.github.com/Ashoat/3a5ded2549db082c5516606f3c3c5da5',
  );
  invariant(dbType === 'mariadb10.8', `${dbType} is not a valid dbType`);
  return dbType;
}

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
      dbType: assertValidDBType(process.env.COMM_DATABASE_TYPE),
    };
  } else {
    const importedDBConfig = await getCommConfig({
      folder: 'secrets',
      name: 'db_config',
    });
    invariant(importedDBConfig, 'DB config missing');
    dbConfig = {
      ...importedDBConfig,
      dbType: assertValidDBType(importedDBConfig.dbType),
    };
  }
  return dbConfig;
}

async function getDBType(): Promise<DBType> {
  const config = await getDBConfig();
  return config.dbType;
}

export { getDBConfig, getDBType };
