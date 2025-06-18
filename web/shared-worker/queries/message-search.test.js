// @flow

import { getProtocolByThreadID } from 'lib/shared/threads/protocols/thread-protocols.js';
import { messageTypes } from 'lib/types/message-types-enum.js';

import { getDatabaseModule } from '../db-module.js';
import type { WebMessage } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Message search queries', () => {
  let queryExecutor;
  let dbModule;

  const userID = '111';
  const futureType = null;
  const localID = null;

  const testCases = [
    {
      threadID: '40db5619-feb2-4e5f-bd0c-1f9a709d366e',
      description: 'with thick thread',
    },
    {
      threadID: '7A8BC7B3-BBBE-4980-8737-E3E67A26FBD2|115614',
      description: 'with thin thread',
    },
  ];

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
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  testCases.forEach(({ threadID, description }) => {
    it(`should find messages matching provided query ${description}`, () => {
      const text = 'test text';
      const id = '1';
      const message: WebMessage = {
        id,
        localID,
        thread: threadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType,
        content: text,
        time: BigInt(123),
      };
      queryExecutor.replaceMessage(
        message,
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id, id, text);
      const result = queryExecutor.searchMessages('test', threadID, null, null);
      expect(result.length).toBe(1);
      expect(result[0].message).toStrictEqual(message);
    });

    it(`should find all messages matching provided query ${description}`, () => {
      const text1 = 'test text';
      const id1 = '1';
      queryExecutor.replaceMessage(
        {
          id: id1,
          localID,
          thread: threadID,
          user: userID,
          type: messageTypes.TEXT,
          futureType,
          content: text1,
          time: BigInt(1),
        },
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id1, id1, text1);

      const text2 = 'I am test';
      const id2 = '2';
      queryExecutor.replaceMessage(
        {
          id: id2,
          localID,
          thread: threadID,
          user: userID,
          type: messageTypes.TEXT,
          futureType,
          content: text2,
          time: BigInt(1),
        },
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id2, id2, text2);
      const result = queryExecutor.searchMessages('test', threadID, null, null);
      expect(result.length).toBe(2);
    });

    it(`should ignore messages not matching provided query ${description}`, () => {
      const text1 = 'test text';
      const id1 = '1';
      const matchingMessage: WebMessage = {
        id: id1,
        localID,
        thread: threadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType,
        content: text1,
        time: BigInt(123),
      };
      queryExecutor.replaceMessage(
        matchingMessage,
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id1, id1, text1);

      const text2 = 'I am text';
      const id2 = '2';
      queryExecutor.replaceMessage(
        {
          id: id2,
          localID,
          thread: threadID,
          user: userID,
          type: messageTypes.TEXT,
          futureType,
          content: text2,
          time: BigInt(1),
        },
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id2, id2, text2);
      const result = queryExecutor.searchMessages('test', threadID, null, null);
      expect(result.length).toBe(1);
      expect(result[0].message).toStrictEqual(matchingMessage);
    });

    it(`should match message edits ${description}`, () => {
      const text1 = 'I am text';
      const id1 = '1';
      const matchingMessage: WebMessage = {
        id: id1,
        localID,
        thread: threadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType,
        content: text1,
        time: BigInt(1),
      };
      queryExecutor.replaceMessage(
        matchingMessage,
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id1, id1, text1);

      const text2 = 'I am test';
      const id2 = '2';
      queryExecutor.replaceMessage(
        {
          id: id2,
          localID,
          thread: threadID,
          user: userID,
          type: messageTypes.EDIT_MESSAGE,
          futureType,
          content: JSON.stringify({ targetMessageID: id1 }),
          time: BigInt(5),
        },
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id1, id2, text2);
      const result = queryExecutor.searchMessages('test', threadID, null, null);

      expect(result.length).toBe(2);
      expect(result[0].message).toStrictEqual(matchingMessage);
    });

    it(`should return only messages with time equal or smaller than timestampCursor ${description}`, () => {
      const timeOlderThanSearchedFor = BigInt(1);
      const timeSearchedFor = '1000';
      const timeNewerThanSearchedFor = BigInt(2000);

      const text = 'test';

      const id1 = '1';
      const matchingMessage: WebMessage = {
        id: id1,
        localID,
        thread: threadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType,
        content: text,
        time: timeOlderThanSearchedFor,
      };
      queryExecutor.replaceMessage(
        matchingMessage,
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id1, id1, text);

      const id2 = '2';
      queryExecutor.replaceMessage(
        {
          id: id2,
          localID,
          thread: threadID,
          user: userID,
          type: messageTypes.TEXT,
          futureType,
          content: text,
          time: timeNewerThanSearchedFor,
        },
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id2, id2, text);
      const result = queryExecutor.searchMessages(
        text,
        threadID,
        timeSearchedFor,
        '0',
      );
      expect(result.length).toBe(1);
      expect(result[0].message).toStrictEqual(matchingMessage);
    });

    it(`should correctly return messages with regards to messageIDCursor ${description}`, () => {
      const text = 'test';
      const time = BigInt(1);

      const id1 = '1';
      const matchingMessage: WebMessage = {
        id: id1,
        localID,
        thread: threadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType,
        content: text,
        time,
      };
      queryExecutor.replaceMessage(
        matchingMessage,
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id1, id1, text);

      const id2 = '2';
      queryExecutor.replaceMessage(
        {
          id: id2,
          localID,
          thread: threadID,
          user: userID,
          type: messageTypes.TEXT,
          futureType,
          content: text,
          time,
        },
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id2, id2, text);

      const result = queryExecutor.searchMessages(
        text,
        threadID,
        time.toString(),
        id2,
      );
      expect(result.length).toBe(1);
      expect(result[0].message).toStrictEqual(matchingMessage);
    });

    it(`should prioritize timestampCursor over messageIDCursor ${description}`, () => {
      const text = 'text';

      const greaterID = '600';
      const smallerID = '2';
      const intBetweenIDs = '100';

      const olderTimestamp = BigInt(1);
      const youngerTimestamp = BigInt(1000);
      const timeBetweenTimestamps = '500';

      const matchingMessage: WebMessage = {
        id: greaterID,
        localID,
        thread: threadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType,
        content: text,
        time: olderTimestamp,
      };
      queryExecutor.replaceMessage(
        matchingMessage,
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(greaterID, greaterID, text);

      queryExecutor.replaceMessage(
        {
          id: smallerID,
          localID,
          thread: threadID,
          user: userID,
          type: messageTypes.TEXT,
          futureType,
          content: text,
          time: youngerTimestamp,
        },
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(smallerID, smallerID, text);
      const result = queryExecutor.searchMessages(
        text,
        threadID,
        timeBetweenTimestamps,
        intBetweenIDs,
      );

      expect(result.length).toBe(1);
      expect(result[0].message.id).toBe(greaterID);
      expect(result[0].message).toStrictEqual(matchingMessage);
    });

    it(`should return messages in correct order ${description}`, () => {
      const text = 'test';

      const id1 = '1';
      const secondMessage: WebMessage = {
        id: id1,
        localID,
        thread: threadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType,
        content: text,
        time: BigInt(1),
      };
      queryExecutor.replaceMessage(
        secondMessage,
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id1, id1, text);

      const id2 = '2';
      const firstMessage: WebMessage = {
        id: id2,
        localID,
        thread: threadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType,
        content: text,
        time: BigInt(2),
      };
      queryExecutor.replaceMessage(
        firstMessage,
        !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
      );
      queryExecutor.updateMessageSearchIndex(id2, id2, text);

      const result = queryExecutor.searchMessages(text, threadID, null, null);
      expect(result.length).toBe(2);
      expect(result[0].message).toStrictEqual(firstMessage);
      expect(result[1].message).toStrictEqual(secondMessage);
    });
  });
});
