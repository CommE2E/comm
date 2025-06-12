// @flow

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Message store threads queries', () => {
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
    queryExecutor.replaceMessageStoreThreads(
      [
        { id: '1', startReached: 0 },
        { id: '2', startReached: 0 },
        { id: '3', startReached: 0 },
        { id: '4', startReached: 0 },
      ],
      false,
    );
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all message store threads', () => {
    const threads = queryExecutor.getAllMessageStoreThreads();
    expect(threads.length).toBe(4);
  });

  it('should remove all message store threads', () => {
    queryExecutor.removeAllMessageStoreThreads();
    const threads = queryExecutor.getAllMessageStoreThreads();
    expect(threads.length).toBe(0);
  });

  it('should remove a subset of message store threads', () => {
    queryExecutor.removeMessageStoreThreads(['2', '3']);
    const threads = queryExecutor.getAllMessageStoreThreads();
    expect(threads.length).toBe(2);
  });
});
