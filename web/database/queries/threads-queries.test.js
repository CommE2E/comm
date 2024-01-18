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
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    queryExecutor.replaceThreadWeb({
      id: '1',
      type: 1,
      name: { value: '', isNull: true },
      avatar: { value: '', isNull: true },
      description: { value: '', isNull: true },
      color: '1',
      creationTime: '1',
      parentThreadID: { value: '', isNull: true },
      containingThreadID: { value: '', isNull: true },
      community: { value: '', isNull: true },
      members: '1',
      roles: '1',
      currentUser: '1',
      sourceMessageID: { value: '', isNull: true },
      repliesCount: 1,
      pinnedCount: 1,
    });
    queryExecutor.replaceThreadWeb({
      id: '2',
      type: 1,
      name: { value: '', isNull: true },
      avatar: { value: '', isNull: true },
      description: { value: '', isNull: true },
      color: '1',
      creationTime: '1',
      parentThreadID: { value: '', isNull: true },
      containingThreadID: { value: '', isNull: true },
      community: { value: '', isNull: true },
      members: '1',
      roles: '1',
      currentUser: '1',
      sourceMessageID: { value: '', isNull: true },
      repliesCount: 1,
      pinnedCount: 1,
    });
    queryExecutor.replaceThreadWeb({
      id: '3',
      type: 1,
      name: { value: '', isNull: true },
      avatar: { value: '', isNull: true },
      description: { value: '', isNull: true },
      color: '1',
      creationTime: '1',
      parentThreadID: { value: '', isNull: true },
      containingThreadID: { value: '', isNull: true },
      community: { value: '', isNull: true },
      members: '1',
      roles: '1',
      currentUser: '1',
      sourceMessageID: { value: '', isNull: true },
      repliesCount: 1,
      pinnedCount: 1,
    });
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all message store threads', () => {
    const threads = queryExecutor.getAllThreadsWeb();
    expect(threads.length).toBe(3);
  });

  it('should remove all threads', () => {
    queryExecutor.removeAllThreads();
    const threads = queryExecutor.getAllThreadsWeb();
    expect(threads.length).toBe(0);
  });

  it('should remove subset of threads', () => {
    queryExecutor.removeThreads(['2']);
    const threads = queryExecutor.getAllThreadsWeb();
    expect(threads.length).toBe(2);
  });
});
