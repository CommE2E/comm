// @flow

import initSqlJs from 'sql.js';

import {
  getSQLiteDBVersion,
  setSQLiteDBVersion,
} from './queries/db-queries.js';

describe('sql.js', () => {
  it('should construct a Database', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    expect(db).not.toBe(undefined);
  });

  it('should return default database version', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    expect(getSQLiteDBVersion(db)).toBe(0);
  });

  it('should update database version', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    setSQLiteDBVersion(db, 10);
    expect(getSQLiteDBVersion(db)).toBe(10);
  });
});
