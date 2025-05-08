// @flow

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Threads queries', () => {
  let queryExecutor;
  let dbModule;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    if (!queryExecutor) {
      throw new Error('SQLiteQueryExecutor is missing');
    }
    queryExecutor.replaceThread({
      id: '1',
      type: 1,
      name: null,
      avatar: null,
      description: null,
      color: '1',
      creationTime: BigInt(1),
      parentThreadID: null,
      containingThreadID: null,
      community: null,
      members: '1',
      roles: '1',
      currentUser: '1',
      sourceMessageID: null,
      repliesCount: 1,
      pinnedCount: 1,
      timestamps: null,
    });
    queryExecutor.replaceThread({
      id: '2',
      type: 1,
      name: null,
      avatar: null,
      description: null,
      color: '1',
      creationTime: BigInt(1),
      parentThreadID: null,
      containingThreadID: null,
      community: null,
      members: '1',
      roles: '1',
      currentUser: '1',
      sourceMessageID: null,
      repliesCount: 1,
      pinnedCount: 1,
      timestamps: null,
    });
    queryExecutor.replaceThread({
      id: '3',
      type: 1,
      name: null,
      avatar: null,
      description: null,
      color: '1',
      creationTime: BigInt(1),
      parentThreadID: null,
      containingThreadID: null,
      community: null,
      members: '1',
      roles: '1',
      currentUser: '1',
      sourceMessageID: null,
      repliesCount: 1,
      pinnedCount: 1,
      timestamps: null,
    });
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all threads', () => {
    const threads = queryExecutor.getAllThreads();
    expect(threads.length).toBe(3);
  });

  it('should remove all threads', () => {
    queryExecutor.removeAllThreads();
    const threads = queryExecutor.getAllThreads();
    expect(threads.length).toBe(0);
  });

  it('should remove subset of threads', () => {
    queryExecutor.removeThreads(['2']);
    const threads = queryExecutor.getAllThreads();
    expect(threads.length).toBe(2);
  });
});
