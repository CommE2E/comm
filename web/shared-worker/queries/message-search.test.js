// @flow

import { messageTypes } from 'lib/types/message-types-enum.js';

import { getDatabaseModule } from '../db-module.js';
import { type WebMessage } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Message search queries', () => {
  let queryExecutor;
  let dbModule;
  const threadID = '100';
  const userID = '111';
  const futureType = { value: 0, isNull: true };
  const localID = { value: '', isNull: true };

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
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should find messages matching provided query', () => {
    const text = 'test text';
    const id = '1';
    const message: WebMessage = {
      id,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text, isNull: false },
      time: '123',
    };
    queryExecutor.replaceMessageWeb(message);
    queryExecutor.updateMessageSearchIndex(id, id, text);
    const result = queryExecutor.searchMessages('test', threadID, null, null);
    expect(result.length).toBe(1);
    expect(result[0].message).toStrictEqual(message);
  });

  it('should find all messages matching provided query', () => {
    const text1 = 'test text';
    const id1 = '1';
    queryExecutor.replaceMessageWeb({
      id: id1,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text1, isNull: false },
      time: '1',
    });
    queryExecutor.updateMessageSearchIndex(id1, id1, text1);

    const text2 = 'I am test';
    const id2 = '2';
    queryExecutor.replaceMessageWeb({
      id: id2,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text2, isNull: false },
      time: '1',
    });
    queryExecutor.updateMessageSearchIndex(id2, id2, text2);
    const result = queryExecutor.searchMessages('test', threadID, null, null);
    expect(result.length).toBe(2);
  });

  it('should ignore messages not matching provided query', () => {
    const text1 = 'test text';
    const id1 = '1';
    const matchingMessage: WebMessage = {
      id: id1,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text1, isNull: false },
      time: '123',
    };
    queryExecutor.replaceMessageWeb(matchingMessage);
    queryExecutor.updateMessageSearchIndex(id1, id1, text1);

    const text2 = 'I am text';
    const id2 = '2';
    queryExecutor.replaceMessageWeb({
      id: id2,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text2, isNull: false },
      time: '1',
    });
    queryExecutor.updateMessageSearchIndex(id2, id2, text2);
    const result = queryExecutor.searchMessages('test', threadID, null, null);
    expect(result.length).toBe(1);
    expect(result[0].message).toStrictEqual(matchingMessage);
  });

  it('should match message edits', () => {
    const text1 = 'I am text';
    const id1 = '1';
    const matchingMessage: WebMessage = {
      id: id1,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text1, isNull: false },
      time: '1',
    };
    queryExecutor.replaceMessageWeb(matchingMessage);
    queryExecutor.updateMessageSearchIndex(id1, id1, text1);

    const text2 = 'I am test';
    const id2 = '2';
    queryExecutor.replaceMessageWeb({
      id: id2,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.EDIT_MESSAGE,
      futureType,
      content: {
        value: JSON.stringify({ targetMessageID: id1 }),
        isNull: false,
      },
      time: '5',
    });
    queryExecutor.updateMessageSearchIndex(id1, id2, text2);
    const result = queryExecutor.searchMessages('test', threadID, null, null);

    expect(result.length).toBe(2);
    expect(result[0].message).toStrictEqual(matchingMessage);
  });

  it('should return only messages with time equal or smaller than timestampCursor', () => {
    const timeOlderThanSearchedFor = '1';
    const timeSearchedFor = '1000';
    const timeNewerThanSearchedFor = '2000';

    const text = 'test';

    const id1 = '1';
    const matchingMessage: WebMessage = {
      id: id1,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text, isNull: false },
      time: timeOlderThanSearchedFor,
    };
    queryExecutor.replaceMessageWeb(matchingMessage);
    queryExecutor.updateMessageSearchIndex(id1, id1, text);

    const id2 = '2';
    queryExecutor.replaceMessageWeb({
      id: id2,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text, isNull: false },
      time: timeNewerThanSearchedFor,
    });
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

  it('should correctly return messages with regards to messageIDCursor', () => {
    const text = 'test';
    const time = '1';

    const id1 = '1';
    const matchingMessage: WebMessage = {
      id: id1,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text, isNull: false },
      time,
    };
    queryExecutor.replaceMessageWeb(matchingMessage);
    queryExecutor.updateMessageSearchIndex(id1, id1, text);

    const id2 = '2';
    queryExecutor.replaceMessageWeb({
      id: id2,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text, isNull: false },
      time,
    });
    queryExecutor.updateMessageSearchIndex(id2, id2, text);

    const result = queryExecutor.searchMessages(text, threadID, time, id2);
    expect(result.length).toBe(1);
    expect(result[0].message).toStrictEqual(matchingMessage);
  });

  it('should prioritize timestampCursor over messageIDCursor', () => {
    const text = 'text';

    const greaterID = '600';
    const smallerID = '2';
    const intBetweenIDs = '100';

    const olderTimestamp = '1';
    const youngerTimestamp = '1000';
    const timeBetweenTimestamps = '500';

    const matchingMessage: WebMessage = {
      id: greaterID,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text, isNull: false },
      time: olderTimestamp,
    };
    queryExecutor.replaceMessageWeb(matchingMessage);
    queryExecutor.updateMessageSearchIndex(greaterID, greaterID, text);

    queryExecutor.replaceMessageWeb({
      id: smallerID,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text, isNull: false },
      time: youngerTimestamp,
    });
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

  it('should return messages in correct order', () => {
    const text = 'test';

    const id1 = '1';
    const secondMessage: WebMessage = {
      id: id1,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text, isNull: false },
      time: '1',
    };
    queryExecutor.replaceMessageWeb(secondMessage);
    queryExecutor.updateMessageSearchIndex(id1, id1, text);

    const id2 = '2';
    const firstMessage: WebMessage = {
      id: id2,
      localID,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType,
      content: { value: text, isNull: false },
      time: '2',
    };
    queryExecutor.replaceMessageWeb(firstMessage);
    queryExecutor.updateMessageSearchIndex(id2, id2, text);

    const result = queryExecutor.searchMessages(text, threadID, null, null);
    expect(result.length).toBe(2);
    expect(result[0].message).toStrictEqual(firstMessage);
    expect(result[1].message).toStrictEqual(secondMessage);
  });
});
