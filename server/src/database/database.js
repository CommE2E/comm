// @flow

import mysqlPromise from 'mysql2/promise';
import mysql from 'mysql2';
import SQL from 'sql-template-strings';

import dbConfig from '../../secrets/db_config';
import { getScriptContext } from '../scripts/script-context';
import DatabaseMonitor from './monitor';

const SQLStatement = SQL.SQLStatement;

export type QueryResult = [any[] & { insertId?: number }, any[]];

const connectionLimit = 10;

let pool;
function getPool() {
  if (pool) {
    return pool;
  }
  const scriptContext = getScriptContext();
  pool = mysqlPromise.createPool({
    ...dbConfig,
    connectionLimit,
    multipleStatements: !!(
      scriptContext && scriptContext.allowMultiStatementSQLQueries
    ),
  });
  new DatabaseMonitor(pool);
  return pool;
}

type SQLOrString = SQLStatement | string;
function appendSQLArray(
  sql: SQLStatement,
  sqlArray: $ReadOnlyArray<SQLStatement>,
  delimeter: SQLOrString,
) {
  if (sqlArray.length === 0) {
    return sql;
  }
  const [first, ...rest] = sqlArray;
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

async function dbQuery(statement: SQLStatement, triesLeft?: number = 2) {
  const scriptContext = getScriptContext();
  try {
    const sql = statement.sql.trim();
    if (
      scriptContext &&
      scriptContext.dryRun &&
      (sql.startsWith('INSERT') ||
        sql.startsWith('DELETE') ||
        sql.startsWith('UPDATE'))
    ) {
      console.log(rawSQL(statement));
      return [fakeResult];
    }
    return await getPool().query(statement);
  } catch (e) {
    if (e.errno === 1213 && triesLeft > 0) {
      console.log('deadlock occurred, trying again', e);
      return await dbQuery(statement, triesLeft - 1);
    }
    e.query = statement.sql;
    throw e;
  }
}

function rawSQL(statement: SQLStatement) {
  return mysql.format(statement.sql, statement.values);
}

export {
  getPool,
  SQL,
  SQLStatement,
  appendSQLArray,
  mergeAndConditions,
  mergeOrConditions,
  dbQuery,
  rawSQL,
};
