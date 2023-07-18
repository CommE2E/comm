// @flow

import { getDatabaseModule } from '../db-module.js';

const TEST_USER_ID_KEY = 'current_user_id';
const TEST_USER_ID_VAL = 'qwerty1234';

describe('Metadata queries', () => {
  let queryExecutor;

  beforeAll(async () => {
    const module = getDatabaseModule();
    queryExecutor = new module.SQLiteQueryExecutor('test.sqlite');
  });

  beforeEach(() => {
    queryExecutor.setMetadata(TEST_USER_ID_KEY, TEST_USER_ID_VAL);
  });

  afterEach(() => {
    queryExecutor.clearMetadata(TEST_USER_ID_KEY);
  });

  it('should return the data of an existing name', () => {
    expect(queryExecutor.getMetadata(TEST_USER_ID_KEY)).toBe(TEST_USER_ID_VAL);
  });

  it('should return undefined for a non-existing name', () => {
    const nonExistingName = 'non_existing_name';
    expect(queryExecutor.getMetadata(nonExistingName)).toBe('');
  });

  it('should set the data of an existing name', () => {
    const newUserID = 'newID123';
    queryExecutor.setMetadata(TEST_USER_ID_KEY, newUserID);
    expect(queryExecutor.getMetadata(TEST_USER_ID_KEY)).toBe(newUserID);
  });

  it('should set the data of a non-existing name', () => {
    const newEntry = 'testEntry';
    const newData = 'testData';
    queryExecutor.setMetadata(newEntry, newData);
    expect(queryExecutor.getMetadata(newEntry)).toBe(newData);
    expect(queryExecutor.getMetadata(TEST_USER_ID_KEY)).toBe(TEST_USER_ID_VAL);
  });

  it('should clear an existing entry', () => {
    queryExecutor.clearMetadata(TEST_USER_ID_KEY);
    expect(queryExecutor.getMetadata(TEST_USER_ID_KEY)).toBe('');
  });

  it('should do nothing when clearing a non-existing entry', () => {
    const nonExistingName = 'non_existing_name';
    queryExecutor.clearMetadata(nonExistingName);
    expect(queryExecutor.getMetadata(nonExistingName)).toBe('');
    expect(queryExecutor.getMetadata(TEST_USER_ID_KEY)).toBe(TEST_USER_ID_VAL);
  });
});
