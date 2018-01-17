// @flow

import mysqlPromise from 'mysql2/promise';
import mysql from 'mysql2';
import SQL from 'sql-template-strings';

import dbConfig from '../secrets/db_config';

const SQLStatement = SQL.SQLStatement;

export type QueryResult = [
  any[] & { insertId?: number },
  any[],
];

export type Connection = {
  query(query: string): Promise<QueryResult>;
  end(): Promise<void>;
};

async function connect(): Promise<Connection> {
  return await mysqlPromise.createConnection(dbConfig);
}

type SQLOrString = SQLStatement | string;
function appendSQLArray(
  sql: SQLStatement,
  sqlArray: SQLStatement[],
  delimeter: SQLOrString,
) {
  if (sqlArray.length === 0) {
    return sql;
  }
  const [ first, ...rest ] = sqlArray;
  sql.append(first);
  if (rest.length === 0) {
    return sql;
  }
  return rest.reduce(
    (prev: SQLStatement, curr: SQLStatement) =>
      prev.append(delimeter).append(curr),
    sql,
  );
}

function rawSQL(statement: SQLStatement) {
  return mysql.format(statement.sql, ...statement.values);
}

export {
  connect,
  SQL,
  appendSQLArray,
  rawSQL,
};
