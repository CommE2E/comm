// @flow

import {
  type OutboundP2PMessage,
  outboundP2PMessageStatuses,
} from 'lib/types/sqlite-types.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const timestamp1 = new Date('2023-01-01T00:00:00').getTime().toString();
const timestamp2 = new Date('2023-01-02T00:00:00').getTime().toString();
const timestamp3 = new Date('2023-01-03T00:00:00').getTime().toString();
const timestamp4 = new Date('2023-01-04T00:00:00').getTime().toString();

const device1 = 'device-1';
const device2 = 'device-2';

const TEST_MSG_1: OutboundP2PMessage = {
  messageID: 'id-1',
  deviceID: device1,
  userID: 'user-1',
  timestamp: timestamp2,
  plaintext: 'decrypted-1',
  ciphertext: 'encrypted-1',
  status: 'encrypted',
  supportsAutoRetry: false,
};
const TEST_MSG_2: OutboundP2PMessage = {
  messageID: 'id-2',
  deviceID: device2,
  userID: 'user-2',
  timestamp: timestamp3,
  plaintext: 'decrypted-2',
  ciphertext: 'encrypted-2',
  status: 'encrypted',
  supportsAutoRetry: false,
};

const TEST_MSG_3: OutboundP2PMessage = {
  messageID: 'id-3',
  deviceID: device1,
  userID: 'user-1',
  timestamp: timestamp1,
  plaintext: 'decrypted-3',
  ciphertext: 'encrypted-3',
  status: 'encrypted',
  supportsAutoRetry: false,
};

const TEST_MSG_4: OutboundP2PMessage = {
  messageID: 'id-4',
  deviceID: device1,
  userID: 'user-1',
  timestamp: timestamp4,
  plaintext: 'decrypted-4',
  ciphertext: '',
  status: 'encrypted',
  supportsAutoRetry: false,
};

const messagesOrdered = [TEST_MSG_3, TEST_MSG_1, TEST_MSG_2, TEST_MSG_4];

describe('Outbound P2P messages queries', () => {
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
    queryExecutor?.addOutboundP2PMessages([
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
    expect(queryExecutor?.getAllOutboundP2PMessages().length).toBe(4);
  });

  it('should return messages in correct order', () => {
    const messages = queryExecutor?.getAllOutboundP2PMessages();
    expect(messages).toStrictEqual(messagesOrdered);
  });

  it('should remove message', () => {
    queryExecutor?.removeOutboundP2PMessage(
      TEST_MSG_4.messageID,
      TEST_MSG_4.deviceID,
    );

    expect(queryExecutor?.getAllOutboundP2PMessages().length).toBe(3);
    expect(queryExecutor?.getAllOutboundP2PMessages()).toStrictEqual([
      TEST_MSG_3,
      TEST_MSG_1,
      TEST_MSG_2,
    ]);
  });

  it('should remove all messages for given device', () => {
    queryExecutor?.removeAllOutboundP2PMessages(device1);
    queryExecutor?.removeAllOutboundP2PMessages(device2);
    expect(queryExecutor?.getAllOutboundP2PMessages().length).toBe(0);
  });

  it('should set ciphertext for given message', () => {
    const ciphertext = 'updated';

    queryExecutor?.setCiphertextForOutboundP2PMessage(
      TEST_MSG_4.messageID,
      TEST_MSG_4.deviceID,
      ciphertext,
    );

    const messages = queryExecutor?.getAllOutboundP2PMessages() ?? [];
    expect(messages.length).toBe(4);
    expect(
      messages.find(msg => msg.messageID === TEST_MSG_4.messageID)?.ciphertext,
    ).toBe(ciphertext);
  });

  it('should mark message status as sent', () => {
    queryExecutor?.markOutboundP2PMessageAsSent(
      TEST_MSG_4.messageID,
      TEST_MSG_4.deviceID,
    );

    const messages = queryExecutor?.getAllOutboundP2PMessages() ?? [];
    expect(messages.length).toBe(3);
    expect(
      messages.find(msg => msg.messageID === TEST_MSG_4.messageID),
    ).toBeFalsy();
  });

  it('should return message by ID', () => {
    expect(queryExecutor?.getOutboundP2PMessagesByID(['id-4'])).toEqual([
      TEST_MSG_4,
    ]);
  });

  it('should return message by IDs', () => {
    expect(queryExecutor?.getOutboundP2PMessagesByID(['id-4', 'id-2'])).toEqual(
      [TEST_MSG_2, TEST_MSG_4],
    );
  });

  it(`should return undefined when a message with ID doesn't exist`, () => {
    expect(queryExecutor?.getOutboundP2PMessagesByID(['id-5'])).toEqual([]);
  });

  it('should reset messages', () => {
    const deviceID = 'deviceID';
    const MSG_TO_RESET_1: OutboundP2PMessage = {
      messageID: 'reset-1',
      deviceID,
      userID: 'user-1',
      timestamp: '1',
      plaintext: 'decrypted-1',
      ciphertext: 'encrypted-1',
      status: 'encrypted',
      supportsAutoRetry: true,
    };

    const MSG_TO_RESET_2: OutboundP2PMessage = {
      messageID: 'reset-2',
      deviceID,
      userID: 'user-1',
      timestamp: '1',
      plaintext: 'decrypted-1',
      ciphertext: 'encrypted-1',
      status: 'sent',
      supportsAutoRetry: false,
    };

    const MSG_NOT_RESET: OutboundP2PMessage = {
      messageID: 'reset-3',
      deviceID,
      userID: 'user-1',
      timestamp: '3',
      plaintext: 'decrypted-1',
      ciphertext: 'encrypted-1',
      status: 'encrypted',
      supportsAutoRetry: false,
    };

    queryExecutor?.addOutboundP2PMessages([
      MSG_TO_RESET_1,
      MSG_TO_RESET_2,
      MSG_NOT_RESET,
    ]);

    const messageIDs =
      queryExecutor?.resetOutboundP2PMessagesForDevice(deviceID);

    expect(messageIDs).toEqual([
      MSG_TO_RESET_1.messageID,
      MSG_TO_RESET_2.messageID,
    ]);

    const messagesAfterReset = [
      {
        ...MSG_TO_RESET_1,
        status: outboundP2PMessageStatuses.persisted,
        ciphertext: '',
        supportsAutoRetry: true,
      },
      {
        ...MSG_TO_RESET_2,
        status: outboundP2PMessageStatuses.persisted,
        ciphertext: '',
        supportsAutoRetry: true,
      },
    ];
    expect(queryExecutor?.getOutboundP2PMessagesByID(messageIDs ?? [])).toEqual(
      messagesAfterReset,
    );
    expect(
      queryExecutor?.getOutboundP2PMessagesByID([MSG_NOT_RESET.messageID]),
    ).toEqual([
      {
        ...MSG_NOT_RESET,
        ciphertext: '',
        status: outboundP2PMessageStatuses.persisted,
      },
    ]);
  });
});
