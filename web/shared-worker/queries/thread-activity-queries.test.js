// @flow

import { threadActivityStoreOpsHandlers } from 'lib/ops/thread-activity-store-ops.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('ThreadActivity Store queries', () => {
  let queryExecutor: ?SQLiteQueryExecutor = null;
  let dbModule: ?EmscriptenModule = null;

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
    // Add backup thread activities
    queryExecutor?.replaceThreadActivityEntry(
      {
        id: 'test_id_1',
        threadActivityStoreEntry: JSON.stringify({
          lastNavigatedTo: 1,
          lastPruned: 2,
        }),
      },
      false,
    );
    queryExecutor?.replaceThreadActivityEntry(
      {
        id: 'test_id_2',
        threadActivityStoreEntry: JSON.stringify({
          lastNavigatedTo: 3,
          lastPruned: 4,
        }),
      },
      false,
    );
    queryExecutor?.replaceThreadActivityEntry(
      {
        id: 'test_id_3',
        threadActivityStoreEntry: JSON.stringify({
          lastNavigatedTo: 5,
          lastPruned: 6,
        }),
      },
      false,
    );
    // Add backup thread activities
    queryExecutor?.replaceThreadActivityEntry(
      {
        id: 'backup_activity_1',
        threadActivityStoreEntry: JSON.stringify({
          lastNavigatedTo: 10,
          lastPruned: 11,
        }),
      },
      true,
    );
    queryExecutor?.replaceThreadActivityEntry(
      {
        id: 'backup_activity_2',
        threadActivityStoreEntry: JSON.stringify({
          lastNavigatedTo: 12,
          lastPruned: 13,
        }),
      },
      true,
    );
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }

    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all thread activity entries from both regular and backup tables', () => {
    const threadActivityEntries = queryExecutor?.getAllThreadActivityEntries();

    expect(threadActivityEntries).toHaveLength(5); // 3 regular + 2 backup

    // Check regular entries exist
    const regularEntries = threadActivityEntries?.filter(e =>
      ['test_id_1', 'test_id_2', 'test_id_3'].includes(e.id),
    );
    expect(regularEntries?.length).toBe(3);

    // Check backup entries exist
    const backupEntries = threadActivityEntries?.filter(e =>
      ['backup_activity_1', 'backup_activity_2'].includes(e.id),
    );
    expect(backupEntries?.length).toBe(2);

    const backup1 = backupEntries?.find(e => e.id === 'backup_activity_1');
    const backup1Data = JSON.parse(backup1?.threadActivityStoreEntry || '{}');
    expect(backup1Data.lastNavigatedTo).toBe(10);
  });

  it('should remove all thread activity entries from both tables', () => {
    queryExecutor?.removeAllThreadActivityEntries();
    const threadActivityEntries = queryExecutor?.getAllThreadActivityEntries();

    expect(threadActivityEntries).toHaveLength(0);
  });

  it('should remove subset of thread activity entries from both tables', () => {
    queryExecutor?.removeThreadActivityEntries([
      'test_id_2',
      'backup_activity_1',
    ]);
    const threadActivityEntries = queryExecutor?.getAllThreadActivityEntries();
    expect(threadActivityEntries?.length).toBe(3); // 5 - 2 = 3

    // Verify correct entries removed
    const remainingIds = threadActivityEntries?.map(e => e.id);
    expect(remainingIds).toContain('test_id_1');
    expect(remainingIds).toContain('test_id_3');
    expect(remainingIds).toContain('backup_activity_2');
    expect(remainingIds).not.toContain('test_id_2');
    expect(remainingIds).not.toContain('backup_activity_1');
  });

  it('should target correct table when replacing based on backupItem parameter', () => {
    // Add new activity to regular table
    queryExecutor?.replaceThreadActivityEntry(
      {
        id: 'new_regular_activity',
        threadActivityStoreEntry: JSON.stringify({
          lastNavigatedTo: 20,
          lastPruned: 21,
        }),
      },
      false,
    );

    // Add new activity to backup table
    queryExecutor?.replaceThreadActivityEntry(
      {
        id: 'new_backup_activity',
        threadActivityStoreEntry: JSON.stringify({
          lastNavigatedTo: 22,
          lastPruned: 23,
        }),
      },
      true,
    );

    const threadActivityEntries = queryExecutor?.getAllThreadActivityEntries();
    expect(threadActivityEntries?.length).toBe(7); // 5 + 2 = 7

    const newRegular = threadActivityEntries?.find(
      e => e.id === 'new_regular_activity',
    );
    const newBackup = threadActivityEntries?.find(
      e => e.id === 'new_backup_activity',
    );

    const regularData = JSON.parse(
      newRegular?.threadActivityStoreEntry || '{}',
    );
    const backupData = JSON.parse(newBackup?.threadActivityStoreEntry || '{}');

    expect(regularData.lastNavigatedTo).toBe(20);
    expect(backupData.lastNavigatedTo).toBe(22);
  });

  it('should update thread activity entry test_id_2', () => {
    queryExecutor?.replaceThreadActivityEntry(
      {
        id: 'test_id_2',
        threadActivityStoreEntry: JSON.stringify({
          lastNavigatedTo: 7,
          lastPruned: 8,
        }),
      },
      false,
    );

    const threadActivityEntries = queryExecutor?.getAllThreadActivityEntries();
    if (!threadActivityEntries) {
      throw new Error('thread activity entries not defined');
    }

    expect(threadActivityEntries).toHaveLength(5);

    const threadActivityEntriesFromDB =
      threadActivityStoreOpsHandlers.translateClientDBData(
        threadActivityEntries,
      );

    expect(threadActivityEntriesFromDB['test_id_2']).toBeDefined();
    expect(threadActivityEntriesFromDB['test_id_2']).toStrictEqual({
      lastNavigatedTo: 7,
      lastPruned: 8,
    });
  });

  it('should remove thread activity entries test_id_1 and test_id_3', () => {
    queryExecutor?.removeThreadActivityEntries(['test_id_1', 'test_id_3']);

    const threadActivityEntries = queryExecutor?.getAllThreadActivityEntries();
    if (!threadActivityEntries) {
      throw new Error('thread activity entries not defined');
    }

    expect(threadActivityEntries.length).toBe(3);

    const threadActivityEntriesFromDB =
      threadActivityStoreOpsHandlers.translateClientDBData(
        threadActivityEntries,
      );

    expect(threadActivityEntriesFromDB['test_id_2']).toBeDefined();
  });
});
