// @flow

import { getDatabaseModule, createSQLiteQueryExecutor } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Threads queries', () => {
  let queryExecutor;
  let dbModule;

  beforeAll(async () => {
    dbModule = await getDatabaseModule();
  });

  beforeEach(() => {
    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    queryExecutor = createSQLiteQueryExecutor(dbModule, FILE_PATH, false);
    if (!queryExecutor) {
      throw new Error('SQLiteQueryExecutor is missing');
    }
    // Add backup threads
    queryExecutor.replaceThread(
      {
        id: '1',
        type: 1,
        name: undefined,
        avatar: undefined,
        description: undefined,
        color: '1',
        creationTime: BigInt(1),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '1',
        roles: '1',
        currentUser: '1',
        sourceMessageID: undefined,
        repliesCount: 1,
        pinnedCount: 1,
        timestamps: undefined,
      },
      false,
    );
    queryExecutor.replaceThread(
      {
        id: '2',
        type: 1,
        name: undefined,
        avatar: undefined,
        description: undefined,
        color: '1',
        creationTime: BigInt(1),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '1',
        roles: '1',
        currentUser: '1',
        sourceMessageID: undefined,
        repliesCount: 1,
        pinnedCount: 1,
        timestamps: undefined,
      },
      false,
    );
    queryExecutor.replaceThread(
      {
        id: '3',
        type: 1,
        name: undefined,
        avatar: undefined,
        description: undefined,
        color: '1',
        creationTime: BigInt(1),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '1',
        roles: '1',
        currentUser: '1',
        sourceMessageID: undefined,
        repliesCount: 1,
        pinnedCount: 1,
        timestamps: undefined,
      },
      false,
    );
    // Add backup threads
    queryExecutor.replaceThread(
      {
        id: 'backup1',
        type: 1,
        name: 'Backup Thread 1',
        avatar: undefined,
        description: undefined,
        color: 'ff0000',
        creationTime: BigInt(2000),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '2',
        roles: '2',
        currentUser: '2',
        sourceMessageID: undefined,
        repliesCount: 2,
        pinnedCount: 1,
        timestamps: undefined,
      },
      true,
    );
    queryExecutor.replaceThread(
      {
        id: 'backup2',
        type: 1,
        name: 'Backup Thread 2',
        avatar: undefined,
        description: undefined,
        color: '00ff00',
        creationTime: BigInt(3000),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '3',
        roles: '3',
        currentUser: '3',
        sourceMessageID: undefined,
        repliesCount: 3,
        pinnedCount: 2,
        timestamps: undefined,
      },
      true,
    );
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all threads from both regular and backup tables', () => {
    const threads = queryExecutor.getAllThreads();
    expect(threads.length).toBe(5); // 3 regular + 2 backup

    // Check regular threads exist
    const regularThreads = threads.filter(t => ['1', '2', '3'].includes(t.id));
    expect(regularThreads.length).toBe(3);

    // Check backup threads exist
    const backupThreads = threads.filter(t =>
      ['backup1', 'backup2'].includes(t.id),
    );
    expect(backupThreads.length).toBe(2);

    const backup1 = backupThreads.find(t => t.id === 'backup1');
    expect(backup1?.name).toBe('Backup Thread 1');
  });

  it('should remove all threads from both tables', () => {
    queryExecutor.removeAllThreads();
    const threads = queryExecutor.getAllThreads();
    expect(threads.length).toBe(0);
  });

  it('should remove subset of threads from both tables', () => {
    const threadsToRemove = ['2', 'backup1'];
    queryExecutor.removeThreads(threadsToRemove);
    const threads = queryExecutor.getAllThreads();
    expect(threads.length).toBe(3); // 5 - 2 = 3

    // Verify correct threads removed
    const remainingIds = threads.map(t => t.id);
    expect(remainingIds).toContain('1');
    expect(remainingIds).toContain('3');
    expect(remainingIds).toContain('backup2');
    expect(remainingIds).not.toContain('2');
    expect(remainingIds).not.toContain('backup1');
  });

  it('should target correct table when replacing based on backupItem parameter', () => {
    // Add new thread to regular table
    queryExecutor.replaceThread(
      {
        id: 'new_regular',
        type: 1,
        name: 'New Regular Thread',
        avatar: undefined,
        description: undefined,
        color: 'ff00ff',
        creationTime: BigInt(4000),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '4',
        roles: '4',
        currentUser: '4',
        sourceMessageID: undefined,
        repliesCount: 4,
        pinnedCount: 0,
        timestamps: undefined,
      },
      false,
    );

    // Add new thread to backup table
    queryExecutor.replaceThread(
      {
        id: 'new_backup',
        type: 1,
        name: 'New Backup Thread',
        avatar: undefined,
        description: undefined,
        color: '00ffff',
        creationTime: BigInt(5000),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '5',
        roles: '5',
        currentUser: '5',
        sourceMessageID: undefined,
        repliesCount: 5,
        pinnedCount: 3,
        timestamps: undefined,
      },
      true,
    );

    const threads = queryExecutor.getAllThreads();
    expect(threads.length).toBe(7); // 5 + 2 = 7

    const newRegular = threads.find(t => t.id === 'new_regular');
    const newBackup = threads.find(t => t.id === 'new_backup');

    expect(newRegular?.name).toBe('New Regular Thread');
    expect(newBackup?.name).toBe('New Backup Thread');
  });
});
