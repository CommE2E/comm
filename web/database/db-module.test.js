// @flow

import { getDatabaseModule } from './db-module.js';
import { clearSensitiveData, exportDatabaseContent } from './utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_KEY = 'a';
const TEST_VAL = 'b';

describe('Database Module', () => {
  it('should construct a Database', async () => {
    const module = getDatabaseModule();
    const queryExecutor = new module.SQLiteQueryExecutor(FILE_PATH);
    expect(queryExecutor).not.toBe(undefined);
  });

  it('should handle clearing sensitive data', async () => {
    const module = getDatabaseModule();
    const queryExecutor = new module.SQLiteQueryExecutor(FILE_PATH);

    expect(() => exportDatabaseContent(module, FILE_PATH)).not.toThrow();
    expect(() => queryExecutor.setMetadata(TEST_KEY, TEST_VAL)).not.toThrow();

    clearSensitiveData(module, FILE_PATH, queryExecutor);

    expect(() => exportDatabaseContent(module, FILE_PATH)).toThrow();
    expect(() => queryExecutor.setMetadata(TEST_KEY, TEST_VAL)).toThrow();
  });
});
