// @flow

import { getDatabaseModule } from './db-module.js';
import { clearSensitiveData, exportDatabaseContent } from './utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_KEY = 'a';
const TEST_VAL = 'b';

describe('Database Module', () => {
  it('should construct a Database', async () => {
    const module = getDatabaseModule();
    const queryExecutor = new module.SQLiteQueryExecutor(FILE_PATH, false);
    expect(queryExecutor).not.toBe(undefined);
  });

  it('should handle clearing sensitive data', async () => {
    const module = getDatabaseModule();
    const queryExecutor = new module.SQLiteQueryExecutor(FILE_PATH, false);

    expect(() => exportDatabaseContent(module, FILE_PATH)).not.toThrow();
    expect(() => queryExecutor.setMetadata(TEST_KEY, TEST_VAL)).not.toThrow();
    expect(module.FS.stat(FILE_PATH)).toBeDefined();

    clearSensitiveData(module, FILE_PATH, queryExecutor);
    expect(() => exportDatabaseContent(module, FILE_PATH)).toThrow();
    expect(() => queryExecutor.setMetadata(TEST_KEY, TEST_VAL)).toThrow();
    expect(() => module.FS.stat(FILE_PATH)).toThrow();
  });
});

describe('Database transactions', () => {
  it('should commit transaction', async () => {
    const module = getDatabaseModule();
    const queryExecutor = new module.SQLiteQueryExecutor(FILE_PATH, false);
    queryExecutor.beginTransaction();
    queryExecutor.setMetadata(TEST_KEY, TEST_VAL);
    queryExecutor.commitTransaction();
    expect(queryExecutor.getMetadata(TEST_KEY)).toBe(TEST_VAL);
  });

  it('should rollback transaction', async () => {
    const module = getDatabaseModule();
    const queryExecutor = new module.SQLiteQueryExecutor(FILE_PATH, false);
    queryExecutor.beginTransaction();
    queryExecutor.setMetadata(TEST_KEY, TEST_VAL);
    queryExecutor.rollbackTransaction();
    expect(queryExecutor.getMetadata(TEST_KEY)).toBe('');
  });

  it('should throw when beginning transaction twice', async () => {
    const module = getDatabaseModule();
    const queryExecutor = new module.SQLiteQueryExecutor(FILE_PATH, false);
    queryExecutor.beginTransaction();
    expect(() => queryExecutor.beginTransaction()).toThrow();
  });

  it('should throw when commit/rollback without beginning transaction', async () => {
    const module = getDatabaseModule();
    const queryExecutor = new module.SQLiteQueryExecutor(FILE_PATH, false);
    expect(() => queryExecutor.commitTransaction()).toThrow();
    expect(() => queryExecutor.rollbackTransaction()).toThrow();
  });
});
