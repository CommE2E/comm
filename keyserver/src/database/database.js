// @flow

import type { ConnectionOptions, QueryResults, PoolOptions } from 'mysql';
import mysql from 'mysql2';
import mysqlPromise from 'mysql2/promise.js';
import SQL from 'sql-template-strings';

import { connectionLimit, queryWarnTime } from './consts.js';
import { getDBConfig } from './db-config.js';
import DatabaseMonitor from './monitor.js';
import type {
  Connection,
  Pool,
  SQLOrString,
  SQLStatementType,
} from './types.js';
import { getScriptContext } from '../scripts/script-context.js';

const SQLStatement: SQLStatementType = SQL.SQLStatement;

let migrationConnection;
async function getMigrationConnection() {
  if (migrationConnection) {
    return migrationConnection;
  }
  const { dbType, ...dbConfig } = await getDBConfig();
  const options: ConnectionOptions = dbConfig;
  migrationConnection = await mysqlPromise.createConnection(options);
  return migrationConnection;
}

let pool, databaseMonitor;
async function loadPool(): Promise<Pool> {
  if (pool) {
    return pool;
  }
  const scriptContext = getScriptContext();
  const { dbType, ...dbConfig } = await getDBConfig();
  const options: PoolOptions = {
    ...dbConfig,
    connectionLimit,
    multipleStatements: !!(
      scriptContext && scriptContext.allowMultiStatementSQLQueries
    ),
  };

  // This function can be run asynchronously multiple times,
  // the previous check is not enough because the function will await
  // on `getDBConfig()` and as result we might get there
  // while the pool is already defined, which will result with
  // creating a new pool and losing the previous one which will stay open
  if (pool) {
    return pool;
  }
  pool = mysqlPromise.createPool(options);
  databaseMonitor = new DatabaseMonitor(pool);
  return pool;
}

function endPool() {
  pool?.end();
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
const fakeResult: QueryResults = (() => {
  const result: any = [];
  result.insertId = -1;
  return result;
})();

const MYSQL_DEADLOCK_ERROR_CODE = 1213;

type ConnectionContext = {
  +migrationsActive?: boolean,
};
let connectionContext = {
  migrationsActive: false,
};

function setConnectionContext(newContext: ConnectionContext) {
  connectionContext = {
    ...connectionContext,
    ...newContext,
  };
  if (!connectionContext.migrationsActive && migrationConnection) {
    migrationConnection.end();
    migrationConnection = undefined;
  }
}

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
  if (connectionContext.migrationsActive) {
    connection = await getMigrationConnection();
  }
  if (multipleStatements) {
    connection = await getMultipleStatementsConnection();
  }
  if (!connection) {
    connection = await loadPool();
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
    if (e.errno === MYSQL_DEADLOCK_ERROR_CODE && triesLeft > 0) {
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

async function getMultipleStatementsConnection(): Promise<Connection> {
  const { dbType, ...dbConfig } = await getDBConfig();
  const options: ConnectionOptions = {
    ...dbConfig,
    multipleStatements: true,
  };
  return await mysqlPromise.createConnection(options);
}

export {
  endPool,
  SQL,
  SQLStatement,
  appendSQLArray,
  mergeAndConditions,
  mergeOrConditions,
  setConnectionContext,
  dbQuery,
  rawSQL,
  getMultipleStatementsConnection,
};
