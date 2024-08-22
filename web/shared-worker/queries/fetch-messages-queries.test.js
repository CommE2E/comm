// @flow

import { messageTypes } from 'lib/types/message-types-enum.js';

import { getDatabaseModule } from '../db-module.js';
import { createNullableInt, createNullableString } from '../types/entities.js';
import type {
  MessageEntity,
  WebMessage,
} from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Fetch messages queries', () => {
  let queryExecutor;
  let dbModule;
  const threadID = '123';

  beforeAll(async () => {
    dbModule = getDatabaseModule();

    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    if (!queryExecutor) {
      throw new Error('SQLiteQueryExecutor is missing');
    }

    for (let i = 0; i < 50; i++) {
      const message: WebMessage = {
        id: i.toString(),
        localID: createNullableString(),
        thread: threadID,
        user: '124',
        type: messageTypes.TEXT,
        futureType: createNullableInt(),
        content: createNullableString(`text-${i}`),
        time: i.toString(),
      };
      queryExecutor.replaceMessageWeb(message);
    }
  });

  afterAll(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  function assertMessageEqual(message: MessageEntity, id: number) {
    const expected: WebMessage = {
      id: id.toString(),
      localID: createNullableString(),
      thread: threadID,
      user: '124',
      type: messageTypes.TEXT,
      futureType: createNullableInt(),
      content: createNullableString(`text-${id}`),
      time: id.toString(),
    };
    expect(message.message).toEqual(expected);
  }

  it('should fetch the first messages', () => {
    const result = queryExecutor.fetchMessagesWeb(threadID, 5, 0);
    expect(result.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      assertMessageEqual(result[i], 49 - i);
    }
  });

  it('should fetch the following messages', () => {
    const result = queryExecutor.fetchMessagesWeb(threadID, 5, 5);
    expect(result.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      assertMessageEqual(result[i], 44 - i);
    }
  });

  it('should fetch the last messages', () => {
    const result = queryExecutor.fetchMessagesWeb(threadID, 5, 45);
    expect(result.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      assertMessageEqual(result[i], 4 - i);
    }
  });

  it('should check if thread ID matches', () => {
    const result = queryExecutor.fetchMessagesWeb('000', 5, 45);
    expect(result.length).toBe(0);
  });

  it('should fetch the remaining messages when limit exceeds the bounds', () => {
    const result = queryExecutor.fetchMessagesWeb(threadID, 100, 40);
    expect(result.length).toBe(10);
    for (let i = 0; i < 10; i++) {
      assertMessageEqual(result[i], 9 - i);
    }
  });

  it('should return all the messages when limit is high enough', () => {
    const result = queryExecutor.fetchMessagesWeb(threadID, 500, 0);
    expect(result.length).toBe(50);
    for (let i = 0; i < 50; i++) {
      assertMessageEqual(result[i], 49 - i);
    }
  });
});
