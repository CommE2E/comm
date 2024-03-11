// @flow

import {
  integrityStoreOpsHandlers,
  convertIntegrityThreadHashesToClientDBIntegrityThreadHashes,
} from 'lib/ops/integrity-store-ops.js';
import type { ThreadHashes } from 'lib/types/integrity-types.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_THREAD_HASHES_1: ThreadHashes = {
  '256|2204191': 1029852,
  '256|2205980': 3119392,
  '256|2208693': 4157082,
  '256|2210486': 3425604,
  '256|2212631': 8951764,
};

const TEST_THREAD_HASHES_UPDATE: ThreadHashes = {
  '256|2339307': 3727323,
  '256|2210486': 2528515,
  '256|2212631': 4041137,
};

describe('Integrity Store queries', () => {
  let queryExecutor: ?SQLiteQueryExecutor = null;
  let dbModule: ?EmscriptenModule = null;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    if (!dbModule) {
      return;
    }

    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    queryExecutor?.replaceIntegrityThreadHashes(
      convertIntegrityThreadHashesToClientDBIntegrityThreadHashes(
        TEST_THREAD_HASHES_1,
      ),
    );
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }

    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all thread hashes', () => {
    const threadHashes = queryExecutor?.getAllIntegrityThreadHashes();

    expect(threadHashes).toHaveLength(5);
  });

  it('should update two thread hashes and add a new thread hash', () => {
    queryExecutor?.replaceIntegrityThreadHashes(
      convertIntegrityThreadHashesToClientDBIntegrityThreadHashes(
        TEST_THREAD_HASHES_UPDATE,
      ),
    );

    const threadHashes = queryExecutor?.getAllIntegrityThreadHashes();
    if (!threadHashes) {
      throw new Error('thread hashes are not defined');
    }

    expect(threadHashes).toHaveLength(6);

    const threadHashesFromDB =
      integrityStoreOpsHandlers.translateClientDBData(threadHashes);

    expect(threadHashesFromDB['256|2204191']).toBe(1029852);
    expect(threadHashesFromDB['256|2205980']).toBe(3119392);
    expect(threadHashesFromDB['256|2208693']).toBe(4157082);
    expect(threadHashesFromDB['256|2210486']).toBe(2528515);
    expect(threadHashesFromDB['256|2212631']).toBe(4041137);
    expect(threadHashesFromDB['256|2339307']).toBe(3727323);
  });

  it('should remove two thread hashes', () => {
    queryExecutor?.removeIntegrityThreadHashes(['256|2204191', '256|2205980']);

    const threadHashes = queryExecutor?.getAllIntegrityThreadHashes();

    if (!threadHashes) {
      throw new Error('thread hashes not defined');
    }

    expect(threadHashes.length).toBe(3);
  });

  it('should remove all thread hashes', () => {
    queryExecutor?.removeAllIntegrityThreadHashes();
    const threadHashes = queryExecutor?.getAllIntegrityThreadHashes();

    expect(threadHashes).toHaveLength(0);
  });
});
