// @flow

import initSqlJs from 'sql.js';

import { getDbVersion } from './queries/db-queries.js';

describe('sq.js', () => {
  it('should construct a Database', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    expect(db).not.toBe(undefined);
  });

  it('should return default database version', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    expect(getDbVersion(db)).toBe(0);
  });
});
