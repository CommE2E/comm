// @flow

import { syncedMetadataStoreOpsHandlers } from 'lib/ops/synced-metadata-store-ops.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('SyncedMetadata Store queries', () => {
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
    queryExecutor?.replaceSyncedMetadataEntry({
      name: 'test_name_1',
      data: 'test_data_1',
    });
    queryExecutor?.replaceSyncedMetadataEntry({
      name: 'test_name_2',
      data: 'test_data_2',
    });
    queryExecutor?.replaceSyncedMetadataEntry({
      name: 'test_name_3',
      data: 'test_data_3',
    });
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }

    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all synced metadata', () => {
    const syncedMetadata = queryExecutor?.getAllSyncedMetadata();

    expect(syncedMetadata).toHaveLength(3);
  });

  it('should remove all synced metadata', () => {
    queryExecutor?.removeAllSyncedMetadata();
    const syncedMetadata = queryExecutor?.getAllSyncedMetadata();

    expect(syncedMetadata).toHaveLength(0);
  });

  it('should update synced metadata entry test_name_2', () => {
    queryExecutor?.replaceSyncedMetadataEntry({
      name: 'test_name_2',
      data: 'updated_test_data_2',
    });

    const syncedMetadata = queryExecutor?.getAllSyncedMetadata();
    if (!syncedMetadata) {
      throw new Error('synced metadata not defined');
    }

    expect(syncedMetadata).toHaveLength(3);

    const syncedMetadataFromDB =
      syncedMetadataStoreOpsHandlers.translateClientDBData(syncedMetadata);

    expect(syncedMetadataFromDB['test_name_2']).toBeDefined();
    expect(syncedMetadataFromDB['test_name_2']).toBe('updated_test_data_2');
  });

  it('should remove synced metadata entry', () => {
    queryExecutor?.removeSyncedMetadata(['test_name_1', 'test_name_3']);

    const syncedMetadata = queryExecutor?.getAllSyncedMetadata();
    if (!syncedMetadata) {
      throw new Error('synced metadata not defined');
    }

    expect(syncedMetadata.length).toBe(1);

    const syncedMetadataFromDB =
      syncedMetadataStoreOpsHandlers.translateClientDBData(syncedMetadata);

    expect(syncedMetadataFromDB['test_name_2']).toBeDefined();
  });
});
