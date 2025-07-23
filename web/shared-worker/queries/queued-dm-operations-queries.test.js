// @flow

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import {
  type SQLiteQueryExecutor,
  type ClientDBQueuedDMOperation,
} from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_OPERATION_1: ClientDBQueuedDMOperation = {
  queueType: 'thread',
  queueKey: 'thread123',
  operationData:
    '{"type":"send_text_message","threadID":"thread123","text":"Hello"}',
  timestamp: '1642500000000',
};

const TEST_OPERATION_2: ClientDBQueuedDMOperation = {
  queueType: 'membership',
  queueKey: 'thread456#user789',
  operationData:
    '{"type":"add_members","threadID":"thread456","userIDs":["user789"]}',
  timestamp: '1642500001000',
};

const TEST_OPERATION_3: ClientDBQueuedDMOperation = {
  queueType: 'message',
  queueKey: 'msg101',
  operationData:
    '{"type":"send_reaction_message","messageID":"msg101","reaction":"👍"}',
  timestamp: '1642500002000',
};

describe('Queued DM Operations queries', () => {
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
    queryExecutor?.addQueuedDMOperation(TEST_OPERATION_1);
    queryExecutor?.addQueuedDMOperation(TEST_OPERATION_2);
    queryExecutor?.addQueuedDMOperation(TEST_OPERATION_3);
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all queued operations', () => {
    const operations = queryExecutor?.getQueuedDMOperations() ?? [];
    expect(operations?.length).toBe(3);

    // Operations should be ordered by timestamp
    const timestamps = operations.map(op => op.timestamp);
    expect(timestamps).toEqual([
      '1642500000000',
      '1642500001000',
      '1642500002000',
    ]);
  });

  it('should add new queued operation', () => {
    const newOperation: ClientDBQueuedDMOperation = {
      queueType: 'entry',
      queueKey: 'entry123',
      operationData:
        '{"type":"create_entry","entryID":"entry123","text":"New entry"}',
      timestamp: '1642500003000',
    };

    queryExecutor?.addQueuedDMOperation(newOperation);
    const operations = queryExecutor?.getQueuedDMOperations() ?? [];
    expect(operations?.length).toBe(4);

    const addedOperation = operations.find(op => op.queueKey === 'entry123');
    expect(addedOperation).toBeDefined();
    expect(addedOperation?.operationData).toContain('New entry');
  });

  it('should remove operations older than timestamp', () => {
    // Remove operations older than 1642500001500 (between operation 2 and 3)
    queryExecutor?.removeQueuedDMOperationsOlderThan('1642500001500');

    const remainingOperations = queryExecutor?.getQueuedDMOperations() ?? [];
    expect(remainingOperations?.length).toBe(1);

    // Only the newest operation should remain
    expect(remainingOperations[0].timestamp).toBe('1642500002000');
    expect(remainingOperations[0].queueKey).toBe('msg101');
  });

  it('should clear operations for specific queue', () => {
    // Clear all operations for the thread queue
    queryExecutor?.clearQueuedDMOperations('thread', 'thread123');

    const operations = queryExecutor?.getQueuedDMOperations() ?? [];
    expect(operations?.length).toBe(2);

    // Thread operation should be gone
    const threadOperations = operations.filter(op => op.queueType === 'thread');
    expect(threadOperations?.length).toBe(0);

    // Other operations should remain
    const queueKeys = operations.map(op => op.queueKey);
    expect(queueKeys).toContain('thread456#user789');
    expect(queueKeys).toContain('msg101');
    expect(queueKeys).not.toContain('thread123');
  });

  it('should clear membership operations correctly', () => {
    // Clear membership operation for specific thread and user
    queryExecutor?.clearQueuedDMOperations('membership', 'thread456#user789');

    const operations = queryExecutor?.getQueuedDMOperations() ?? [];
    expect(operations?.length).toBe(2);

    // Membership operation should be gone
    const membershipOperations = operations.filter(
      op => op.queueType === 'membership',
    );
    expect(membershipOperations?.length).toBe(0);

    // Other operations should remain
    const queueKeys = operations.map(op => op.queueKey);
    expect(queueKeys).toContain('thread123');
    expect(queueKeys).toContain('msg101');
    expect(queueKeys).not.toContain('thread456#user789');
  });

  it('should handle empty results gracefully', () => {
    // Clear all operations by removing everything older than current timestamp
    const currentTimestamp = Date.now().toString();
    queryExecutor?.removeQueuedDMOperationsOlderThan(currentTimestamp);

    const operations = queryExecutor?.getQueuedDMOperations() ?? [];
    expect(operations?.length).toBe(0);
  });
});
