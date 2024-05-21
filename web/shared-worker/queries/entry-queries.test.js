// @flow

import type { ClientDBEntryInfo } from 'lib/ops/entries-store-ops.js';
import { entryID } from 'lib/shared/entry-utils.js';
import type { RawEntryInfo, RawEntryInfos } from 'lib/types/entry-types.js';

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

function convertRawEntryInfoToClientDBEntryInfo(
  entryInfo: RawEntryInfo,
): ClientDBEntryInfo {
  return {
    id: entryID(entryInfo),
    entryInfo: JSON.stringify(entryInfo),
  };
}

function translateClientDBData(
  entries: $ReadOnlyArray<ClientDBEntryInfo>,
): RawEntryInfos {
  const entryInfos: { [id: string]: RawEntryInfo } = {};
  entries.forEach(dbEntry => {
    entryInfos[dbEntry.id] = JSON.parse(dbEntry.entryInfo);
  });
  return entryInfos;
}

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
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    if (!queryExecutor) {
      throw new Error('SQLiteQueryExecutor is missing');
    }
    queryExecutor?.replaceEntry(
      convertRawEntryInfoToClientDBEntryInfo(TEST_ENTRY_1),
    );
    queryExecutor?.replaceEntry(
      convertRawEntryInfoToClientDBEntryInfo(TEST_ENTRY_2),
    );
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all entries', () => {
    const entries = queryExecutor?.getAllEntries();
    expect(entries?.length).toBe(2);
  });

  it('should remove all entries', () => {
    queryExecutor?.removeAllEntries();
    const entries = queryExecutor?.getAllEntries();
    expect(entries?.length).toBe(0);
  });

  it('should update text property', () => {
    const updatedText = 'updated_test_entry_text';
    const updatedTestEntry = {
      ...TEST_ENTRY_2,
      text: updatedText,
    };
    queryExecutor?.replaceEntry(
      convertRawEntryInfoToClientDBEntryInfo(updatedTestEntry),
    );

    const dbEntries = queryExecutor?.getAllEntries();
    if (!dbEntries) {
      throw new Error('entries not defined');
    }

    const entries = translateClientDBData(dbEntries);
    expect(entries['1']).toBeDefined();
    expect(entries['1'].creatorID).toBe('1');
    expect(entries['1'].text).toBe(updatedText);
  });

  it('should remove entry', () => {
    queryExecutor?.removeEntries(['1']);

    const entries = queryExecutor?.getAllEntries();
    if (!entries) {
      throw new Error('entries not defined');
    }
    expect(entries.length).toBe(1);
    expect(entries[0].id).toBe('0');
  });
});
