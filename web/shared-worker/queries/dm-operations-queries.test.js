// @flow

import { convertDMOperationIntoClientDBDMOperation } from 'lib/ops/dm-operations-store-ops.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_OPERATION_1 = {
  type: 'send_text_message',
  threadID: '0',
  creatorID: '2',
  time: 3,
  messageID: '2',
  text: 'abc123',
};

const TEST_OPERATION_2 = {
  type: 'leave_thread',
  editorID: '5',
  time: 12,
  messageID: '3',
  threadID: '0',
};

describe('DM Operations Store queries', () => {
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

    queryExecutor?.replaceDMOperation(
      convertDMOperationIntoClientDBDMOperation({
        id: '0',
        type: TEST_OPERATION_1.type,
        operation: TEST_OPERATION_1,
      }),
    );

    queryExecutor?.replaceDMOperation(
      convertDMOperationIntoClientDBDMOperation({
        id: '1',
        type: TEST_OPERATION_2.type,
        operation: TEST_OPERATION_2,
      }),
    );
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all operations', () => {
    const operations = queryExecutor?.getAllDMOperations();
    expect(operations?.length).toBe(2);
  });

  it('should remove all operations', () => {
    queryExecutor?.removeAllDMOperations();
    const operations = queryExecutor?.getAllDMOperations();
    expect(operations?.length).toBe(0);
  });

  it('should remove operation', () => {
    queryExecutor?.removeDMOperations(['0']);
    const operations = queryExecutor?.getAllDMOperations();
    expect(operations?.length).toBe(1);
    expect(operations?.[0]).toEqual(
      convertDMOperationIntoClientDBDMOperation({
        id: '1',
        type: TEST_OPERATION_2.type,
        operation: TEST_OPERATION_2,
      }),
    );
  });

  it('should query operations by type', () => {
    const operations =
      queryExecutor?.getDMOperationsByType('send_text_message');
    expect(operations?.length).toBe(1);
    expect(operations?.[0]).toEqual(
      convertDMOperationIntoClientDBDMOperation({
        id: '0',
        type: TEST_OPERATION_1.type,
        operation: TEST_OPERATION_1,
      }),
    );
  });
});
