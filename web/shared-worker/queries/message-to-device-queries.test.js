// @flow

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import {
  type ClientMessageToDevice,
  type SQLiteQueryExecutor,
} from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const timestamp1 = new Date('2023-01-01T00:00:00').getTime().toString();
const timestamp2 = new Date('2023-01-02T00:00:00').getTime().toString();
const timestamp3 = new Date('2023-01-03T00:00:00').getTime().toString();
const timestamp4 = new Date('2023-01-04T00:00:00').getTime().toString();

const device1 = 'device-1';
const device2 = 'device-2';

const TEST_MSG_1: ClientMessageToDevice = {
  messageID: 'id-1',
  deviceID: device1,
  userID: 'user-1',
  timestamp: timestamp2,
  plaintext: 'decrypted-1',
  ciphertext: 'encrypted-1',
};
const TEST_MSG_2: ClientMessageToDevice = {
  messageID: 'id-2',
  deviceID: device2,
  userID: 'user-2',
  timestamp: timestamp3,
  plaintext: 'decrypted-2',
  ciphertext: 'encrypted-2',
};

const TEST_MSG_3: ClientMessageToDevice = {
  messageID: 'id-3',
  deviceID: device1,
  userID: 'user-1',
  timestamp: timestamp1,
  plaintext: 'decrypted-3',
  ciphertext: 'encrypted-3',
};

const TEST_MSG_4: ClientMessageToDevice = {
  messageID: 'id-4',
  deviceID: device1,
  userID: 'user-1',
  timestamp: timestamp4,
  plaintext: 'decrypted-4',
  ciphertext: 'encrypted-4',
};

const device1MessagesOrdered = [TEST_MSG_3, TEST_MSG_1, TEST_MSG_4];

describe('Message to device queries', () => {
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
    queryExecutor?.addMessagesToDevice([
      TEST_MSG_1,
      TEST_MSG_2,
      TEST_MSG_3,
      TEST_MSG_4,
    ]);
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all messages', () => {
    expect(queryExecutor?.getAllMessagesToDevice(device1).length).toBe(3);
    expect(queryExecutor?.getAllMessagesToDevice(device2).length).toBe(1);
  });

  it('should return messages in correct order', () => {
    const messages = queryExecutor?.getAllMessagesToDevice(device1);
    expect(messages).toStrictEqual(device1MessagesOrdered);
  });

  it('should remove when there is only one message', () => {
    queryExecutor?.removeMessagesToDeviceOlderThan(TEST_MSG_2);
    expect(queryExecutor?.getAllMessagesToDevice(device2).length).toBe(0);
  });

  it('should remove older messages', () => {
    queryExecutor?.removeMessagesToDeviceOlderThan(TEST_MSG_1);
    expect(queryExecutor?.getAllMessagesToDevice(device1)).toStrictEqual([
      TEST_MSG_4,
    ]);
  });

  it('should remove all messages for given device', () => {
    queryExecutor?.removeAllMessagesForDevice(device1);
    expect(queryExecutor?.getAllMessagesToDevice(device1).length).toBe(0);
    queryExecutor?.removeAllMessagesForDevice(device2);
    expect(queryExecutor?.getAllMessagesToDevice(device2).length).toBe(0);
  });
});
