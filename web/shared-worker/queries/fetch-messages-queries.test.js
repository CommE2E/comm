// @flow

import { threadSpecs } from 'lib/shared/threads/thread-specs.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { ThreadType } from 'lib/types/thread-types-enum.js';

import { getDatabaseModule } from '../db-module.js';
import type {
  MessageEntity,
  WebMessage,
} from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Fetch messages queries', () => {
  let queryExecutor;
  let dbModule;
  const userID = '124';
  const threadID = '123';
  const threadType: ThreadType = threadTypes.COMMUNITY_OPEN_SUBTHREAD;
  const thickThreadID = 'thick-thread-123';
  const thickThreadType: ThreadType = threadTypes.PERSONAL;

  beforeAll(async () => {
    dbModule = getDatabaseModule();

    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH, false);
    if (!queryExecutor) {
      throw new Error('SQLiteQueryExecutor is missing');
    }

    // Create the regular thread
    queryExecutor.replaceThread(
      {
        id: threadID,
        type: threadType,
        name: null,
        avatar: null,
        description: null,
        color: 'ffffff',
        creationTime: BigInt(1000),
        parentThreadID: null,
        containingThreadID: null,
        community: null,
        members: '1',
        roles: '1',
        currentUser: '{}',
        sourceMessageID: null,
        repliesCount: 0,
        pinnedCount: 0,
        timestamps: null,
      },
      threadSpecs[threadType].protocol().dataIsBackedUp,
    );

    // Create 50 messages using the appropriate backup flag
    for (let i = 0; i < 50; i++) {
      const message: WebMessage = {
        id: i.toString(),
        localID: null,
        thread: threadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType: null,
        content: `text-${i}`,
        time: BigInt(i),
      };
      queryExecutor.replaceMessage(
        message,
        threadSpecs[threadType].protocol().dataIsBackedUp,
      );
    }

    // Create a thick thread that uses backup tables
    queryExecutor.replaceThread(
      {
        id: thickThreadID,
        type: thickThreadType,
        name: null,
        avatar: null,
        description: null,
        color: 'ffffff',
        creationTime: BigInt(2000),
        parentThreadID: null,
        containingThreadID: null,
        community: null,
        members: '1',
        roles: '1',
        currentUser: '{}',
        sourceMessageID: null,
        repliesCount: 0,
        pinnedCount: 0,
        timestamps: null,
      },
      threadSpecs[thickThreadType].protocol().dataIsBackedUp,
    );

    // Add 10 messages to the thick thread (which will go to backup tables)
    for (let i = 0; i < 10; i++) {
      const message: WebMessage = {
        id: `thick-${i}`,
        localID: null,
        thread: thickThreadID,
        user: userID,
        type: messageTypes.TEXT,
        futureType: null,
        content: `thick-text-${i}`,
        time: BigInt(1000 + i),
      };
      queryExecutor.replaceMessage(
        message,
        threadSpecs[thickThreadType].protocol().dataIsBackedUp,
      );
    }
  });

  afterAll(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  function assertMessageEqual(message: MessageEntity, id: number) {
    const expected: WebMessage = {
      id: id.toString(),
      localID: null,
      thread: threadID,
      user: userID,
      type: messageTypes.TEXT,
      futureType: null,
      content: `text-${id}`,
      time: BigInt(id),
    };
    expect(message.message).toEqual(expected);
  }

  it('should fetch the first messages', () => {
    const result = queryExecutor.fetchMessages(threadID, 5, 0);
    expect(result.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      assertMessageEqual(result[i], 49 - i);
    }
  });

  it('should fetch the following messages', () => {
    const result = queryExecutor.fetchMessages(threadID, 5, 5);
    expect(result.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      assertMessageEqual(result[i], 44 - i);
    }
  });

  it('should fetch the last messages', () => {
    const result = queryExecutor.fetchMessages(threadID, 5, 45);
    expect(result.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      assertMessageEqual(result[i], 4 - i);
    }
  });

  it('should check if thread ID matches', () => {
    const result = queryExecutor.fetchMessages('000', 5, 45);
    expect(result.length).toBe(0);
  });

  it('should fetch the remaining messages when limit exceeds the bounds', () => {
    const result = queryExecutor.fetchMessages(threadID, 100, 40);
    expect(result.length).toBe(10);
    for (let i = 0; i < 10; i++) {
      assertMessageEqual(result[i], 9 - i);
    }
  });

  it('should return all the messages when limit is high enough', () => {
    const result = queryExecutor.fetchMessages(threadID, 500, 0);
    expect(result.length).toBe(50);
    for (let i = 0; i < 50; i++) {
      assertMessageEqual(result[i], 49 - i);
    }
  });

  it('should fetch messages from both normal and backup tables', () => {
    // Fetch messages from thick thread - should get all
    // 10 since they're in backup tables
    const thickResult = queryExecutor.fetchMessages(thickThreadID, 20, 0);
    expect(thickResult.length).toBe(10);

    // Verify the messages are correctly fetched (ordered by time DESC)
    for (let i = 0; i < 10; i++) {
      expect(thickResult[i].message.id).toBe(`thick-${9 - i}`);
      expect(thickResult[i].message.content).toBe(`thick-text-${9 - i}`);
      expect(thickResult[i].message.thread).toBe(thickThreadID);
    }

    // Fetch messages from original thin thread - should still work
    const thinResult = queryExecutor.fetchMessages(threadID, 5, 0);
    expect(thinResult.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      assertMessageEqual(thinResult[i], 49 - i);
    }
  });
});
