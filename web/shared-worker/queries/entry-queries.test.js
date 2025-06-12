// @flow

import {
  convertEntryInfoIntoClientDBEntryInfo,
  entryStoreOpsHandlers,
} from 'lib/ops/entries-store-ops.js';
import type { RawEntryInfo } from 'lib/types/entry-types.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_ENTRY_1: RawEntryInfo = {
  creationTime: 0,
  creatorID: '0',
  day: 0,
  deleted: true,
  id: '0',
  month: 0,
  text: 'test_text_1',
  threadID: '0',
  year: 0,
};

const TEST_ENTRY_2: RawEntryInfo = {
  creationTime: 0,
  creatorID: '1',
  day: 0,
  deleted: true,
  localID: '1',
  month: 0,
  text: 'test_text_2',
  threadID: '1',
  year: 0,
};

describe('Entry Store queries', () => {
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
    // Add regular entries
    queryExecutor?.replaceEntry(
      convertEntryInfoIntoClientDBEntryInfo({
        id: '0',
        entry: TEST_ENTRY_1,
        isBackedUp: false,
      }),
      false,
    );
    queryExecutor?.replaceEntry(
      convertEntryInfoIntoClientDBEntryInfo({
        id: '1',
        entry: TEST_ENTRY_2,
        isBackedUp: true,
      }),
      false,
    );
    // Add backup entries
    queryExecutor?.replaceEntry(
      convertEntryInfoIntoClientDBEntryInfo({
        id: 'backup1',
        entry: {
          ...TEST_ENTRY_1,
          id: 'backup1',
          text: 'backup_entry_1',
          threadID: '2',
        },
        isBackedUp: true,
      }),
      true,
    );
    queryExecutor?.replaceEntry(
      convertEntryInfoIntoClientDBEntryInfo({
        id: 'backup2',
        entry: {
          ...TEST_ENTRY_2,
          id: 'backup2',
          text: 'backup_entry_2',
          threadID: '3',
        },
        isBackedUp: false,
      }),
      true,
    );
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all entries from both regular and backup tables', () => {
    const entries = queryExecutor?.getAllEntries();
    expect(entries?.length).toBe(4); // 2 regular + 2 backup

    // Check regular entries exist
    const regularEntries = entries?.filter(e => ['0', '1'].includes(e.id));
    expect(regularEntries?.length).toBe(2);

    // Check backup entries exist
    const backupEntries = entries?.filter(e =>
      ['backup1', 'backup2'].includes(e.id),
    );
    expect(backupEntries?.length).toBe(2);

    const backup1 = backupEntries?.find(e => e.id === 'backup1');
    expect(backup1?.entry).toContain('backup_entry_1');
  });

  it('should remove all entries from both tables', () => {
    queryExecutor?.removeAllEntries();
    const entries = queryExecutor?.getAllEntries();
    expect(entries?.length).toBe(0);
  });

  it('should remove subset of entries from both tables', () => {
    queryExecutor?.removeEntries(['1', 'backup1']);
    const entries = queryExecutor?.getAllEntries();
    expect(entries?.length).toBe(2); // 4 - 2 = 2

    // Verify correct entries removed
    const remainingIds = entries?.map(e => e.id);
    expect(remainingIds).toContain('0');
    expect(remainingIds).toContain('backup2');
    expect(remainingIds).not.toContain('1');
    expect(remainingIds).not.toContain('backup1');
  });

  it('should target correct table when replacing based on backupItem parameter', () => {
    // Add new entry to regular table
    queryExecutor?.replaceEntry(
      convertEntryInfoIntoClientDBEntryInfo({
        id: 'new_regular',
        entry: {
          ...TEST_ENTRY_1,
          id: 'new_regular',
          text: 'new_regular_entry',
          threadID: '5',
        },
        isBackedUp: false,
      }),
      false,
    );

    // Add new entry to backup table
    queryExecutor?.replaceEntry(
      convertEntryInfoIntoClientDBEntryInfo({
        id: 'new_backup',
        entry: {
          ...TEST_ENTRY_2,
          id: 'new_backup',
          text: 'new_backup_entry',
          threadID: '6',
        },
        isBackedUp: true,
      }),
      true,
    );

    const entries = queryExecutor?.getAllEntries();
    expect(entries?.length).toBe(6); // 4 + 2 = 6

    const newRegular = entries?.find(e => e.id === 'new_regular');
    const newBackup = entries?.find(e => e.id === 'new_backup');

    expect(newRegular?.entry).toContain('new_regular_entry');
    expect(newBackup?.entry).toContain('new_backup_entry');
  });

  it('should update text property', () => {
    const updatedText = 'updated_test_entry_text';
    const updatedTestEntry = {
      ...TEST_ENTRY_2,
      text: updatedText,
    };
    queryExecutor?.replaceEntry(
      convertEntryInfoIntoClientDBEntryInfo({
        id: '1',
        entry: updatedTestEntry,
        isBackedUp: false,
      }),
      false,
    );

    const dbEntries = queryExecutor?.getAllEntries();
    if (!dbEntries) {
      throw new Error('entries not defined');
    }

    const entries = entryStoreOpsHandlers.translateClientDBData(dbEntries);
    expect(entries['1']).toBeDefined();
    expect(entries['1'].creatorID).toBe('1');
    expect(entries['1'].text).toBe(updatedText);
  });
});
