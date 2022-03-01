// @flow

import type { QueryResults } from 'mysql';
import mysql from 'mysql2';
import mysqlPromise from 'mysql2/promise';
import SQL from 'sql-template-strings';

import dbConfig from '../../secrets/db_config';
import { getScriptContext } from '../scripts/script-context';
import { connectionLimit, queryWarnTime } from './consts';
import DatabaseMonitor from './monitor';
import type { Pool, SQLOrString, SQLStatementType } from './types';

const SQLStatement: SQLStatementType = SQL.SQLStatement;

let pool, databaseMonitor;
function getPool(): Pool {
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
  databaseMonitor = new DatabaseMonitor(pool);
  return pool;
}

function appendSQLArray(
  sql: SQLStatementType,
  sqlArray: $ReadOnlyArray<SQLStatementType>,
  delimeter: SQLOrString,
): SQLStatementType {
  if (sqlArray.length === 0) {
    return sql;
  }
  const [first, ...rest] = sqlArray;
  sql.append(first);
  if (rest.length === 0) {
    return sql;
  }
  return rest.reduce(
    (prev: SQLStatementType, curr: SQLStatementType) =>
      prev.append(delimeter).append(curr),
    sql,
  );
}

function mergeConditions(
  conditions: $ReadOnlyArray<SQLStatementType>,
  delimiter: SQLStatementType,
): SQLStatementType {
  const sql = SQL` (`;
  appendSQLArray(sql, conditions, delimiter);
  sql.append(SQL`) `);
  return sql;
}

function mergeAndConditions(
  andConditions: $ReadOnlyArray<SQLStatementType>,
): SQLStatementType {
  return mergeConditions(andConditions, SQL` AND `);
}

function mergeOrConditions(
  andConditions: $ReadOnlyArray<SQLStatementType>,
): SQLStatementType {
  return mergeConditions(andConditions, SQL` OR `);
}

// We use this fake result for dry runs
function FakeSQLResult() {
  this.insertId = -1;
}
FakeSQLResult.prototype = Array.prototype;
const fakeResult: QueryResults = (new FakeSQLResult(): any);

type QueryOptions = {
  +triesLeft?: number,
  +multipleStatements?: boolean,
};
async function dbQuery(
  statement: SQLStatementType,
  options?: QueryOptions,
): Promise<QueryResults> {
  const triesLeft = options?.triesLeft ?? 2;
  const multipleStatements = options?.multipleStatements ?? false;

  let connection;
  if (multipleStatements) {
    connection = await getMultipleStatementsConnection();
  }
  if (!connection) {
    connection = getPool();
  }

  const timeoutID = setTimeout(
    () => databaseMonitor.reportLaggingQuery(statement.sql),
    queryWarnTime,
  );
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
      return ([fakeResult]: any);
    }
    return await connection.query(statement);
  } catch (e) {
    if (e.errno === 1213 && triesLeft > 0) {
      console.log('deadlock occurred, trying again', e);
      return await dbQuery(statement, { ...options, triesLeft: triesLeft - 1 });
    }
    e.query = statement.sql;
    throw e;
  } finally {
    clearTimeout(timeoutID);
    if (multipleStatements) {
      connection.end();
    }
  }
}

function rawSQL(statement: SQLStatementType): string {
  return mysql.format(statement.sql, statement.values);
}

async function getMultipleStatementsConnection() {
  return await mysqlPromise.createConnection({
    ...dbConfig,
    multipleStatements: true,
  });
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
