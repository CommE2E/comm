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
    // Add regular message store threads
    queryExecutor.replaceMessageStoreThreads(
      [
        { id: '1', startReached: 0 },
        { id: '2', startReached: 0 },
        { id: '3', startReached: 0 },
        { id: '4', startReached: 0 },
      ],
      false,
    );
    // Add backup message store threads
    queryExecutor.replaceMessageStoreThreads(
      [
        { id: 'backup1', startReached: 1 },
        { id: 'backup2', startReached: 1 },
      ],
      true,
    );
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all message store threads from both regular and backup tables', () => {
    const threads = queryExecutor.getAllMessageStoreThreads();
    expect(threads.length).toBe(6); // 4 regular + 2 backup

    // Check regular threads exist
    const regularThreads = threads.filter(t =>
      ['1', '2', '3', '4'].includes(t.id),
    );
    expect(regularThreads.length).toBe(4);

    // Check backup threads exist
    const backupThreads = threads.filter(t =>
      ['backup1', 'backup2'].includes(t.id),
    );
    expect(backupThreads.length).toBe(2);

    const backup1 = backupThreads.find(t => t.id === 'backup1');
    expect(backup1?.startReached).toBe(1);
  });

  it('should remove all message store threads from both tables', () => {
    queryExecutor.removeAllMessageStoreThreads();
    const threads = queryExecutor.getAllMessageStoreThreads();
    expect(threads.length).toBe(0);
  });

  it('should remove subset of message store threads from both tables', () => {
    queryExecutor.removeMessageStoreThreads(['2', 'backup1']);
    const threads = queryExecutor.getAllMessageStoreThreads();
    expect(threads.length).toBe(4); // 6 - 2 = 4

    // Verify correct threads removed
    const remainingIds = threads.map(t => t.id);
    expect(remainingIds).toContain('1');
    expect(remainingIds).toContain('3');
    expect(remainingIds).toContain('4');
    expect(remainingIds).toContain('backup2');
    expect(remainingIds).not.toContain('2');
    expect(remainingIds).not.toContain('backup1');
  });

  it('should target correct table when replacing based on backupItem parameter', () => {
    // Add new threads to regular table
    queryExecutor.replaceMessageStoreThreads(
      [{ id: 'new_regular', startReached: 0 }],
      false,
    );

    // Add new threads to backup table
    queryExecutor.replaceMessageStoreThreads(
      [{ id: 'new_backup', startReached: 1 }],
      true,
    );

    const threads = queryExecutor.getAllMessageStoreThreads();
    expect(threads.length).toBe(8); // 6 + 2 = 8

    const newRegular = threads.find(t => t.id === 'new_regular');
    const newBackup = threads.find(t => t.id === 'new_backup');

    expect(newRegular?.startReached).toBe(0);
    expect(newBackup?.startReached).toBe(1);
  });
});
