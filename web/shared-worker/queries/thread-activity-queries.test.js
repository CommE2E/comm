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
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }

    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all thread activity entries', () => {
    const threadActivityEntries = queryExecutor?.getAllThreadActivityEntries();

    expect(threadActivityEntries).toHaveLength(3);
  });

  it('should remove all thread activity entries', () => {
    queryExecutor?.removeAllThreadActivityEntries();
    const threadActivityEntries = queryExecutor?.getAllThreadActivityEntries();

    expect(threadActivityEntries).toHaveLength(0);
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

    expect(threadActivityEntries).toHaveLength(3);

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

    expect(threadActivityEntries.length).toBe(1);

    const threadActivityEntriesFromDB =
      threadActivityStoreOpsHandlers.translateClientDBData(
        threadActivityEntries,
      );

    expect(threadActivityEntriesFromDB['test_id_2']).toBeDefined();
  });
});
