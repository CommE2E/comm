// @flow

import type { InboundP2PMessage } from 'lib/types/sqlite-types.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const device1 = 'device-1';
const device2 = 'device-2';

const TEST_MSG_1: InboundP2PMessage = {
  messageID: 'id-1',
  senderDeviceID: device1,
  senderUserID: 'user-1',
  plaintext: 'decrypted-1',
  status: 'none',
};

const TEST_MSG_2: InboundP2PMessage = {
  messageID: 'id-2',
  senderDeviceID: device2,
  senderUserID: 'user-1',
  plaintext: 'decrypted-2',
  status: 'none',
};

const TEST_MSG_3: InboundP2PMessage = {
  messageID: 'id-3',
  senderDeviceID: device1,
  senderUserID: 'user-1',
  plaintext: 'decrypted-3',
  status: 'none',
};

const messagesOrdered = [TEST_MSG_1, TEST_MSG_2, TEST_MSG_3];

describe('Inbound P2P message queries', () => {
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
    queryExecutor?.addInboundP2PMessage(TEST_MSG_1);
    queryExecutor?.addInboundP2PMessage(TEST_MSG_2);
    queryExecutor?.addInboundP2PMessage(TEST_MSG_3);
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all messages', () => {
    const messages = queryExecutor?.getAllInboundP2PMessage() ?? [];
    expect(messages.length).toBe(3);
    expect(messages).toStrictEqual(messagesOrdered);
  });
  it('should remove messages', () => {
    queryExecutor?.removeInboundP2PMessages([TEST_MSG_2.messageID]);
    const messages = queryExecutor?.getAllInboundP2PMessage() ?? [];
    expect(messages.length).toBe(2);
    expect(messages).toStrictEqual([TEST_MSG_1, TEST_MSG_3]);
  });
  it('should return message by id', () => {
    const messages = queryExecutor?.getInboundP2PMessagesByID([
      TEST_MSG_2.messageID,
    ]);
    expect(messages).toStrictEqual([TEST_MSG_2]);
  });
});
