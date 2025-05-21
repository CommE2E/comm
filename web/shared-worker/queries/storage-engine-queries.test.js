// @flow

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_KEY = 'redux-persist';
const TEST_ITEM = '[[{}]]';

describe('redux-persist storage engine queries', () => {
  let queryExecutor;
  let dbModule;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH, false);
    if (!queryExecutor) {
      throw new Error('SQLiteQueryExecutor is missing');
    }
    queryExecutor.setPersistStorageItem(TEST_KEY, TEST_ITEM);
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return the item of an existing key', () => {
    expect(queryExecutor.getPersistStorageItem(TEST_KEY)).toBe(TEST_ITEM);
  });

  it('should return empty string for a non-existing key', () => {
    const nonExistingKey = 'non_existing_key';
    expect(queryExecutor.getPersistStorageItem(nonExistingKey)).toBe('');
  });

  it('should set the item of an existing key', () => {
    const newItem = '[[{a:2]]';
    queryExecutor.setPersistStorageItem(TEST_KEY, newItem);
    expect(queryExecutor.getPersistStorageItem(TEST_KEY)).toBe(newItem);
  });

  it('should set the item of a non-existing key', () => {
    const newEntry = 'testEntry';
    const newData = 'testData';
    queryExecutor.setPersistStorageItem(newEntry, newData);
    expect(queryExecutor.getPersistStorageItem(newEntry)).toBe(newData);
    expect(queryExecutor.getPersistStorageItem(TEST_KEY)).toBe(TEST_ITEM);
  });

  it('should remove an existing key', () => {
    queryExecutor.removePersistStorageItem(TEST_KEY);
    expect(queryExecutor.getPersistStorageItem(TEST_KEY)).toBe('');
  });

  it('should do nothing when removing a non-existing key', () => {
    const nonExistingName = 'non_existing_name';
    queryExecutor.removePersistStorageItem(nonExistingName);
    expect(queryExecutor.getPersistStorageItem(nonExistingName)).toBe('');
    expect(queryExecutor.getPersistStorageItem(TEST_KEY)).toBe(TEST_ITEM);
  });
});
