// @flow

import initSqlJs from 'sql.js';

import { setupSQLiteDB } from './db-queries.js';
import {
  getPersistStorageItem,
  removePersistStorageItem,
  setPersistStorageItem,
} from './storage-engine-queries.js';

const TEST_KEY = 'redux-persist';
const TEST_ITEM = '[[{}]]';

describe('redux-persist storage engine queries', () => {
  let db;

  beforeAll(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
  });

  beforeEach(() => {
    setupSQLiteDB(db);
    const query = `
      INSERT INTO persist_storage (key, item)
      VALUES ($key, $item)
    `;
    const values = {
      $key: TEST_KEY,
      $item: TEST_ITEM,
    };
    db.exec(query, values);
  });

  afterEach(() => {
    db.exec(`DELETE FROM persist_storage`);
  });

  it('should return the item of an existing key', () => {
    expect(getPersistStorageItem(db, TEST_KEY)).toBe(TEST_ITEM);
  });

  it('should return empty string for a non-existing key', () => {
    const nonExistingKey = 'non_existing_key';
    expect(getPersistStorageItem(db, nonExistingKey)).toBe('');
  });

  it('should set the item of an existing key', () => {
    const newItem = '[[{a:2]]';
    setPersistStorageItem(db, TEST_KEY, newItem);
    expect(getPersistStorageItem(db, TEST_KEY)).toBe(newItem);
  });

  it('should set the item of a non-existing key', () => {
    const newEntry = 'testEntry';
    const newData = 'testData';
    setPersistStorageItem(db, newEntry, newData);
    expect(getPersistStorageItem(db, newEntry)).toBe(newData);
    expect(getPersistStorageItem(db, TEST_KEY)).toBe(TEST_ITEM);
  });

  it('should remove an existing key', () => {
    removePersistStorageItem(db, TEST_KEY);
    expect(getPersistStorageItem(db, TEST_KEY)).toBe('');
  });

  it('should do nothing when removing a non-existing key', () => {
    const nonExistingName = 'non_existing_name';
    removePersistStorageItem(db, nonExistingName);
    expect(getPersistStorageItem(db, nonExistingName)).toBe('');
    expect(getPersistStorageItem(db, TEST_KEY)).toBe(TEST_ITEM);
  });
});
