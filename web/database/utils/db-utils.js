// @flow

import { detect as detectBrowser } from 'detect-browser';
import type { QueryExecResult } from 'sql.js';

import { isStaff } from 'lib/shared/staff-utils.js';
import { isDev } from 'lib/utils/dev-utils.js';

import { DB_SUPPORTED_BROWSERS, DB_SUPPORTED_OS } from './constants.js';

function parseSQLiteQueryResult<T>(result: QueryExecResult): T[] {
  const { columns, values } = result;
  return values.map(rowResult => {
    const row: any = Object.fromEntries(
      columns.map((key, index) => [key, rowResult[index]]),
    );
    return row;
  });
}

// NOTE: sql.js has behavior that when there are multiple statements in query
// e.g. "statement1; statement2; statement3;"
// and statement2 will not return anything, the result will be:
// [result1, result3], not [result1, undefined, result3]
function parseMultiStatementSQLiteResult<T: Object>(
  rawResult: $ReadOnlyArray<QueryExecResult>,
): T[][] {
  return rawResult.map((queryResult: QueryExecResult) =>
    parseSQLiteQueryResult<T>(queryResult),
  );
}

function isSQLiteSupported(currentLoggedInUserID: ?string): boolean {
  if (!currentLoggedInUserID) {
    return false;
  }
  if (!isDev && (!currentLoggedInUserID || !isStaff(currentLoggedInUserID))) {
    return false;
  }

  const browser = detectBrowser();
  return (
    DB_SUPPORTED_OS.includes(browser.os) &&
    DB_SUPPORTED_BROWSERS.includes(browser.name)
  );
}

function isDesktopSafari(): boolean {
  const browser = detectBrowser();
  return browser.name === 'safari' && browser.os === 'Mac OS';
}

export { parseMultiStatementSQLiteResult, isSQLiteSupported, isDesktopSafari };
