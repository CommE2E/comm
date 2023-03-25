// @flow

import initSqlJs from 'sql.js';

import { setupSQLiteDB } from './db-queries.js';
import { clearMetadata, getMetadata, setMetadata } from './metadata-queries.js';

const TEST_USER_ID_KEY = 'current_user_id';
const TEST_USER_ID_VAL = 'qwerty1234';

describe('Metadata queries', () => {
  let db;

  beforeAll(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
  });

  beforeEach(() => {
    setupSQLiteDB(db);
    const query = `
      INSERT INTO metadata (name, data)
      VALUES ($name, $val)
    `;
    const values = {
      $name: TEST_USER_ID_KEY,
      $val: TEST_USER_ID_VAL,
    };
    db.exec(query, values);
  });

  afterEach(() => {
    db.exec(`DELETE FROM metadata`);
  });

  it('should return the data of an existing name', () => {
    expect(getMetadata(db, TEST_USER_ID_KEY)).toBe(TEST_USER_ID_VAL);
  });

  it('should return undefined for a non-existing name', () => {
    const nonExistingName = 'non_existing_name';
    expect(getMetadata(db, nonExistingName)).toBeUndefined();
  });

  it('should set the data of an existing name', () => {
    const newUserID = 'newID123';
    setMetadata(db, TEST_USER_ID_KEY, newUserID);
    expect(getMetadata(db, TEST_USER_ID_KEY)).toBe(newUserID);
  });

  it('should set the data of a non-existing name', () => {
    const newEntry = 'testEntry';
    const newData = 'testData';
    setMetadata(db, newEntry, newData);
    expect(getMetadata(db, newEntry)).toBe(newData);
    expect(getMetadata(db, TEST_USER_ID_KEY)).toBe(TEST_USER_ID_VAL);
  });

  it('should clear an existing entry', () => {
    clearMetadata(db, TEST_USER_ID_KEY);
    expect(getMetadata(db, TEST_USER_ID_KEY)).toBeUndefined();
  });

  it('should do nothing when clearing a non-existing entry', () => {
    const nonExistingName = 'non_existing_name';
    clearMetadata(db, nonExistingName);
    expect(getMetadata(db, nonExistingName)).toBeUndefined();
    expect(getMetadata(db, TEST_USER_ID_KEY)).toBe(TEST_USER_ID_VAL);
  });
});
