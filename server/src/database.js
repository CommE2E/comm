// @flow

import mysqlPromise from 'mysql2/promise';
import mysql from 'mysql2';
import SQL from 'sql-template-strings';

import dbConfig from '../secrets/db_config';
import { isDryRun } from './scripts/dry-run';

const SQLStatement = SQL.SQLStatement;

export type QueryResult = [
  any[] & { insertId?: number },
  any[],
];

const pool = mysqlPromise.createPool({
  ...dbConfig,
  connectionLimit: 10,
});

type SQLOrString = SQLStatement | string;
function appendSQLArray(
  sql: SQLStatement,
  sqlArray: $ReadOnlyArray<SQLStatement>,
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

function mergeConditions(
  conditions: $ReadOnlyArray<SQLStatement>,
  delimiter: SQLStatement,
) {
  const sql = SQL` (`;
  appendSQLArray(sql, conditions, delimiter);
  sql.append(SQL`) `);
  return sql;
}

function mergeAndConditions(andConditions: $ReadOnlyArray<SQLStatement>) {
  return mergeConditions(andConditions, SQL` AND `);
}

function mergeOrConditions(andConditions: $ReadOnlyArray<SQLStatement>) {
  return mergeConditions(andConditions, SQL` OR `);
}

// We use this fake result for dry runs
function FakeSQLResult() {
  this.insertId = -1;
}
FakeSQLResult.prototype = Array.prototype;
const fakeResult: any = new FakeSQLResult();

async function dbQuery(statement: SQLStatement) {
  try {
    const sql = statement.sql.trim();
    if (
      isDryRun() &&
      (sql.startsWith("INSERT") ||
        sql.startsWith("DELETE") ||
        sql.startsWith("UPDATE"))
    ) {
      console.log(rawSQL(statement));
      return [ fakeResult ];
    }
    return await pool.query(statement);
  } catch (e) {
    e.query = statement.sql;
    throw e;
  }
}

function rawSQL(statement: SQLStatement) {
  return mysql.format(statement.sql, statement.values);
}

export {
  pool,
  SQL,
  SQLStatement,
  appendSQLArray,
  mergeAndConditions,
  mergeOrConditions,
  dbQuery,
  rawSQL,
};
