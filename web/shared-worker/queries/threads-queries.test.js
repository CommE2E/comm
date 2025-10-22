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
        pinnedMessageIDs: undefined,
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
        pinnedMessageIDs: undefined,
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
        pinnedMessageIDs: undefined,
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
        pinnedMessageIDs: undefined,
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
        pinnedMessageIDs: undefined,
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
    queryExecutor.removeThreads(['2', 'backup1']);
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
        pinnedMessageIDs: undefined,
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
        pinnedMessageIDs: undefined,
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

  it('should write and read pinnedMessageIDs correctly for regular threads', () => {
    const pinnedMessageIDs = '["msg1","msg2","msg3"]';

    queryExecutor.replaceThread(
      {
        id: 'thread_with_pinned',
        type: 1,
        name: 'Thread with Pinned Messages',
        avatar: undefined,
        description: undefined,
        color: 'aabbcc',
        creationTime: BigInt(6000),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '1',
        roles: '1',
        currentUser: '1',
        sourceMessageID: undefined,
        repliesCount: 0,
        pinnedCount: 3,
        timestamps: undefined,
        pinnedMessageIDs,
      },
      false,
    );

    const threads = queryExecutor.getAllThreads();
    const threadWithPinned = threads.find(t => t.id === 'thread_with_pinned');

    expect(threadWithPinned).toBeDefined();
    expect(threadWithPinned?.pinnedMessageIDs).toBe(pinnedMessageIDs);
    expect(threadWithPinned?.pinnedCount).toBe(3);
  });

  it('should write and read pinnedMessageIDs correctly for backup threads', () => {
    const pinnedMessageIDs = '["backup_msg1","backup_msg2"]';

    queryExecutor.replaceThread(
      {
        id: 'backup_thread_with_pinned',
        type: 1,
        name: 'Backup Thread with Pinned Messages',
        avatar: undefined,
        description: undefined,
        color: 'ddeeff',
        creationTime: BigInt(7000),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '2',
        roles: '2',
        currentUser: '2',
        sourceMessageID: undefined,
        repliesCount: 0,
        pinnedCount: 2,
        timestamps: undefined,
        pinnedMessageIDs,
      },
      true,
    );

    const threads = queryExecutor.getAllThreads();
    const backupThreadWithPinned = threads.find(
      t => t.id === 'backup_thread_with_pinned',
    );

    expect(backupThreadWithPinned).toBeDefined();
    expect(backupThreadWithPinned?.pinnedMessageIDs).toBe(pinnedMessageIDs);
    expect(backupThreadWithPinned?.pinnedCount).toBe(2);
  });

  it('should handle undefined pinnedMessageIDs correctly', () => {
    queryExecutor.replaceThread(
      {
        id: 'thread_no_pinned',
        type: 1,
        name: 'Thread without Pinned Messages',
        avatar: undefined,
        description: undefined,
        color: '112233',
        creationTime: BigInt(8000),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '1',
        roles: '1',
        currentUser: '1',
        sourceMessageID: undefined,
        repliesCount: 0,
        pinnedCount: 0,
        timestamps: undefined,
        pinnedMessageIDs: undefined,
      },
      false,
    );

    const threads = queryExecutor.getAllThreads();
    const threadNoPinned = threads.find(t => t.id === 'thread_no_pinned');

    expect(threadNoPinned).toBeDefined();
    expect(threadNoPinned?.pinnedMessageIDs).toBeUndefined();
    expect(threadNoPinned?.pinnedCount).toBe(0);
  });

  it('should update pinnedMessageIDs when replacing existing thread', () => {
    const initialPinnedMessageIDs = '["msg1","msg2"]';
    const updatedPinnedMessageIDs = '["msg1","msg2","msg3","msg4"]';

    // Create initial thread
    queryExecutor.replaceThread(
      {
        id: 'updatable_thread',
        type: 1,
        name: 'Updatable Thread',
        avatar: undefined,
        description: undefined,
        color: '445566',
        creationTime: BigInt(9000),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '1',
        roles: '1',
        currentUser: '1',
        sourceMessageID: undefined,
        repliesCount: 0,
        pinnedCount: 2,
        timestamps: undefined,
        pinnedMessageIDs: initialPinnedMessageIDs,
      },
      false,
    );

    let threads = queryExecutor.getAllThreads();
    let thread = threads.find(t => t.id === 'updatable_thread');
    expect(thread?.pinnedMessageIDs).toBe(initialPinnedMessageIDs);
    expect(thread?.pinnedCount).toBe(2);

    // Update thread with new pinned messages
    queryExecutor.replaceThread(
      {
        id: 'updatable_thread',
        type: 1,
        name: 'Updatable Thread',
        avatar: undefined,
        description: undefined,
        color: '445566',
        creationTime: BigInt(9000),
        parentThreadID: undefined,
        containingThreadID: undefined,
        community: undefined,
        members: '1',
        roles: '1',
        currentUser: '1',
        sourceMessageID: undefined,
        repliesCount: 0,
        pinnedCount: 4,
        timestamps: undefined,
        pinnedMessageIDs: updatedPinnedMessageIDs,
      },
      false,
    );

    threads = queryExecutor.getAllThreads();
    thread = threads.find(t => t.id === 'updatable_thread');
    expect(thread?.pinnedMessageIDs).toBe(updatedPinnedMessageIDs);
    expect(thread?.pinnedCount).toBe(4);
  });
});
