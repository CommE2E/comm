// @flow

import type { ReceivedMessageToDevice } from 'lib/types/sqlite-types.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const device1 = 'device-1';
const device2 = 'device-2';

const TEST_MSG_1: ReceivedMessageToDevice = {
  messageID: 'id-1',
  senderDeviceID: device1,
  plaintext: 'decrypted-1',
  status: 'none',
};

const TEST_MSG_2: ReceivedMessageToDevice = {
  messageID: 'id-2',
  senderDeviceID: device2,
  plaintext: 'decrypted-2',
  status: 'none',
};

const TEST_MSG_3: ReceivedMessageToDevice = {
  messageID: 'id-3',
  senderDeviceID: device1,
  plaintext: 'decrypted-3',
  status: 'none',
};

const messagesOrdered = [TEST_MSG_1, TEST_MSG_2, TEST_MSG_3];

describe('Received messages to device queries', () => {
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
    queryExecutor?.addReceivedMessageToDevice(TEST_MSG_1);
    queryExecutor?.addReceivedMessageToDevice(TEST_MSG_2);
    queryExecutor?.addReceivedMessageToDevice(TEST_MSG_3);
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all messages', () => {
    const messages = queryExecutor?.getAllReceivedMessageToDevice() ?? [];
    expect(messages.length).toBe(3);
    expect(messages).toStrictEqual(messagesOrdered);
  });
  it('should remove messages', () => {
    queryExecutor?.removeReceivedMessagesToDevice([TEST_MSG_2.messageID]);
    const messages = queryExecutor?.getAllReceivedMessageToDevice() ?? [];
    expect(messages.length).toBe(2);
    expect(messages).toStrictEqual([TEST_MSG_1, TEST_MSG_3]);
  });
});
