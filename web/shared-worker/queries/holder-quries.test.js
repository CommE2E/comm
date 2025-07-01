// @flow

import { type ClientDBHolderItem } from 'lib/types/holder-types.js';
import {
  blobHashFromBlobServiceURI,
  generateBlobHolder,
  makeBlobServiceURI,
} from 'lib/utils/blob-service.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_HOLDER_1: ClientDBHolderItem = {
  hash: blobHashFromBlobServiceURI(makeBlobServiceURI('a')),
  holder: generateBlobHolder(),
  status: 'NOT_ESTABLISHED',
};

const TEST_HOLDER_2: ClientDBHolderItem = {
  hash: blobHashFromBlobServiceURI(makeBlobServiceURI('b')),
  holder: generateBlobHolder(),
  status: 'ESTABLISHED',
};

describe('Holder Store queries', () => {
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
    queryExecutor?.replaceHolder(TEST_HOLDER_1);
    queryExecutor?.replaceHolder(TEST_HOLDER_2);
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all holders', () => {
    const holders = queryExecutor?.getHolders() ?? [];
    expect(holders?.length).toBe(2);

    expect(
      [...holders].sort((a: ClientDBHolderItem, b: ClientDBHolderItem) =>
        a.hash.localeCompare(b.hash),
      ),
    ).toEqual(
      [TEST_HOLDER_1, TEST_HOLDER_2].sort(
        (a: ClientDBHolderItem, b: ClientDBHolderItem) =>
          a.hash.localeCompare(b.hash),
      ),
    );
  });

  it('should remove holders', () => {
    queryExecutor?.removeHolders([TEST_HOLDER_1.hash]);
    const holders = queryExecutor?.getHolders();
    expect(holders?.length).toBe(1);

    const remainingHashes = holders?.map(h => h.hash);
    expect(remainingHashes).toContain(TEST_HOLDER_2.hash);
    expect(remainingHashes).not.toContain(TEST_HOLDER_1.hash);
  });

  it('should update holder', () => {
    queryExecutor?.replaceHolder({ ...TEST_HOLDER_2, status: 'NOT_REMOVED' });
    const holders = queryExecutor?.getHolders();
    expect(holders?.length).toBe(2);

    const holder = holders?.find(h => h.hash === TEST_HOLDER_2.hash);
    expect(holder?.status).toEqual('NOT_REMOVED');
  });
});
