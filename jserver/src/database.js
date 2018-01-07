// @flow

import mysql from 'mysql2/promise';
import SQL from 'sql-template-strings';

import dbConfig from '../secrets/db_config';

export type QueryResult = [
  any[] & { insertId?: number },
  any[],
];

export type Connection = {
  query(query: string): Promise<QueryResult>;
  end(): Promise<void>;
};

async function connect(): Promise<Connection> {
  return await mysql.createConnection(dbConfig);
}

export {
  connect,
  SQL,
};
