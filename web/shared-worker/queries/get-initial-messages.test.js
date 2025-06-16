// @flow

import { messageTypes } from 'lib/types/message-types-enum.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('getInitialMessages queries', () => {
  let queryExecutor;
  let dbModule;

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

  const createThread = (
    id: string,
    type: number,
    creationTime: number = 1000,
  ): void => {
    queryExecutor.replaceThread(
      {
        id,
        type,
        name: null,
        avatar: null,
        description: null,
        color: 'ffffff',
        creationTime: BigInt(creationTime),
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
      false,
    );
  };

  const createMessage = (
    id: string,
    threadID: string,
    type: number = messageTypes.TEXT,
    content: ?string = null,
    time: number = 1000,
    userID: string = '1',
  ): void => {
    queryExecutor.replaceMessage(
      {
        id,
        localID: null,
        thread: threadID,
        user: userID,
        type,
        futureType: null,
        content,
        time: BigInt(time),
      },
      false,
    );
  };

  const createMedia = (
    id: string,
    containerID: string,
    threadID: string,
    type: 'photo' | 'video' = 'photo',
    uri: string = 'test_uri',
  ): void => {
    queryExecutor.replaceMedia(
      {
        id,
        container: containerID,
        thread: threadID,
        uri,
        type,
        extras: '{}',
      },
      false,
    );
  };

  it('should return empty array when no messages exist', () => {
    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(0);
  });

  it('should return messages with their media', () => {
    createThread('thread1', threadTypes.COMMUNITY_OPEN_SUBTHREAD);
    createMessage('msg1', 'thread1', messageTypes.TEXT, 'Hello world', 1000);
    createMedia('media1', 'msg1', 'thread1', 'photo');
    createMedia('media2', 'msg1', 'thread1', 'video');

    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(1);
    expect(results[0].message.id).toBe('msg1');
    expect(results[0].message.content).toBe('Hello world');
    expect(results[0].medias.length).toBe(2);
    expect(results[0].medias[0].type).toBe('photo');
    expect(results[0].medias[1].type).toBe('video');
  });

  it('should return messages without media', () => {
    createThread('thread1', threadTypes.COMMUNITY_OPEN_SUBTHREAD);
    createMessage('msg1', 'thread1', messageTypes.TEXT, 'Hello world', 1000);

    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(1);
    expect(results[0].message.id).toBe('msg1');
    expect(results[0].medias.length).toBe(0);
  });

  it('should handle different message types', () => {
    createThread('thread1', threadTypes.COMMUNITY_OPEN_SUBTHREAD);
    createMessage('msg1', 'thread1', messageTypes.TEXT, 'Text message', 1000);
    createMessage('msg2', 'thread1', messageTypes.IMAGES, null, 1100);
    createMessage('msg3', 'thread1', messageTypes.MULTIMEDIA, null, 1200);

    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(3);

    const resultMessageTypes = results.map(r => r.message.type).sort();
    expect(resultMessageTypes).toEqual(
      [messageTypes.TEXT, messageTypes.IMAGES, messageTypes.MULTIMEDIA].sort(),
    );
  });

  it('should limit messages to 20 per thick thread (PERSONAL)', () => {
    createThread('thick_thread', threadTypes.PERSONAL);

    // Create 25 messages to test the 20 message limit
    for (let i = 1; i <= 25; i++) {
      createMessage(
        `msg${i}`,
        'thick_thread',
        messageTypes.TEXT,
        `Message ${i}`,
        1000 + i,
      );
    }

    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(20);

    // Should return the 20 most recent messages (highest time values)
    const times = results
      .map(r => Number(r.message.time))
      .sort((a, b) => b - a);
    expect(times[0]).toBe(1025); // Most recent
    expect(times[19]).toBe(1006); // 20th most recent
  });

  it('should return all messages for thin threads', () => {
    createThread('thin_thread', threadTypes.COMMUNITY_OPEN_SUBTHREAD);

    // Create 30 messages - all should be returned for thin threads
    for (let i = 1; i <= 30; i++) {
      createMessage(
        `msg${i}`,
        'thin_thread',
        messageTypes.TEXT,
        `Message ${i}`,
        1000 + i,
      );
    }

    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(30);
  });

  it('should handle mixed thick and thin threads correctly', () => {
    // Create thick thread with 25 messages
    createThread('thick_thread', threadTypes.PERSONAL);
    for (let i = 1; i <= 25; i++) {
      createMessage(
        `thick_msg${i}`,
        'thick_thread',
        messageTypes.TEXT,
        `Thick ${i}`,
        1000 + i,
      );
    }

    // Create thin thread with 25 messages
    createThread('thin_thread', threadTypes.COMMUNITY_OPEN_SUBTHREAD);
    for (let i = 1; i <= 25; i++) {
      createMessage(
        `thin_msg${i}`,
        'thin_thread',
        messageTypes.TEXT,
        `Thin ${i}`,
        2000 + i,
      );
    }

    const results = queryExecutor.getInitialMessages();
    // Should be 20 from thick + 25 from thin = 45 total
    expect(results.length).toBe(45);

    // Verify we have messages from both threads
    const thickMessages = results.filter(
      r => r.message.thread === 'thick_thread',
    );
    const thinMessages = results.filter(
      r => r.message.thread === 'thin_thread',
    );
    expect(thickMessages.length).toBe(20);
    expect(thinMessages.length).toBe(25);
  });

  it('should return messages ordered by time and id', () => {
    createThread('thread1', threadTypes.COMMUNITY_OPEN_SUBTHREAD);

    // Create messages with different times
    createMessage('msg1', 'thread1', messageTypes.TEXT, 'First', 1000);
    createMessage('msg2', 'thread1', messageTypes.TEXT, 'Second', 1500);
    createMessage('msg3', 'thread1', messageTypes.TEXT, 'Third', 1200);

    // Messages with same time should be ordered by ID
    createMessage('msg4', 'thread1', messageTypes.TEXT, 'Fourth', 1500);

    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(4);

    // Check ordering: should be sorted by time ASC, then ID ASC
    const times = results.map(r => Number(r.message.time));
    const ids = results.map(r => r.message.id);

    expect(times).toEqual([1000, 1200, 1500, 1500]);
    expect(ids).toEqual(['msg1', 'msg3', 'msg2', 'msg4']);
  });

  it('should maintain consistent ordering across multiple threads', () => {
    createThread('thread1', threadTypes.COMMUNITY_OPEN_SUBTHREAD);
    createThread('thread2', threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT);

    createMessage('msg_a', 'thread1', messageTypes.TEXT, 'A', 1000);
    createMessage('msg_b', 'thread2', messageTypes.TEXT, 'B', 1100);
    createMessage('msg_c', 'thread1', messageTypes.TEXT, 'C', 1050);
    createMessage('msg_d', 'thread2', messageTypes.TEXT, 'D', 1200);

    const results = queryExecutor.getInitialMessages();
    const times = results.map(r => Number(r.message.time));
    const ids = results.map(r => r.message.id);

    expect(times).toEqual([1000, 1050, 1100, 1200]);
    expect(ids).toEqual(['msg_a', 'msg_c', 'msg_b', 'msg_d']);
  });

  it('should handle null and empty content correctly', () => {
    createThread('thread1', threadTypes.COMMUNITY_OPEN_SUBTHREAD);
    createMessage('msg1', 'thread1', messageTypes.TEXT, null, 1000);
    createMessage('msg2', 'thread1', messageTypes.TEXT, '', 1100);
    createMessage('msg3', 'thread1', messageTypes.TEXT, 'Valid content', 1200);

    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(3);
    expect(results[0].message.content).toBe(null);
    expect(results[1].message.content).toBe('');
    expect(results[2].message.content).toBe('Valid content');
  });

  it('should handle very large time values correctly', () => {
    createThread('thread1', threadTypes.COMMUNITY_OPEN_SUBTHREAD);
    createMessage('msg1', 'thread1', messageTypes.TEXT, 'Old', 1000);
    createMessage(
      'msg2',
      'thread1',
      messageTypes.TEXT,
      'Future',
      9999999999999,
    );

    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(2);
    expect(Number(results[0].message.time)).toBe(1000);
    expect(Number(results[1].message.time)).toBe(9999999999999);
  });

  it('should handle multiple thick threads with message limits', () => {
    const thickThreadTypes = [
      threadTypes.PERSONAL,
      threadTypes.PRIVATE,
      threadTypes.LOCAL,
    ];

    // Create 3 thick threads of different types, each with 25 messages
    for (let threadNum = 1; threadNum <= 3; threadNum++) {
      const threadType = thickThreadTypes[threadNum - 1];
      createThread(`thick_thread_${threadNum}`, threadType);
      for (let msgNum = 1; msgNum <= 25; msgNum++) {
        createMessage(
          `t${threadNum}_msg${msgNum}`,
          `thick_thread_${threadNum}`,
          messageTypes.TEXT,
          `Thread ${threadNum} Message ${msgNum}`,
          1000 + threadNum * 100 + msgNum,
        );
      }
    }

    const results = queryExecutor.getInitialMessages();
    // Should be 20 messages per thread * 3 threads = 60 total
    expect(results.length).toBe(60);

    // Verify each thread has exactly 20 messages
    for (let threadNum = 1; threadNum <= 3; threadNum++) {
      const threadMessages = results.filter(
        r => r.message.thread === `thick_thread_${threadNum}`,
      );
      expect(threadMessages.length).toBe(20);
    }
  });

  it('should handle mixed scenario with thick/thin threads and media', () => {
    // Thick thread with 30 messages and some media
    createThread('thick_thread', threadTypes.PERSONAL);
    for (let i = 1; i <= 30; i++) {
      createMessage(
        `thick_msg${i}`,
        'thick_thread',
        messageTypes.TEXT,
        `Thick message ${i}`,
        1000 + i,
      );
      // Add media to the most recent messages (26-30) since thick
      // threads only return 20 most recent
      if (i >= 26) {
        createMedia(`thick_media${i}`, `thick_msg${i}`, 'thick_thread');
      }
    }

    // Thin thread with 10 messages and some media
    createThread('thin_thread', threadTypes.COMMUNITY_OPEN_SUBTHREAD);
    for (let i = 1; i <= 10; i++) {
      createMessage(
        `thin_msg${i}`,
        'thin_thread',
        messageTypes.TEXT,
        `Thin message ${i}`,
        2000 + i,
      );
      if (i <= 3) {
        createMedia(`thin_media${i}`, `thin_msg${i}`, 'thin_thread');
      }
    }

    const results = queryExecutor.getInitialMessages();
    expect(results.length).toBe(30); // 20 from thick + 10 from thin

    // Verify media is correctly associated
    const messagesWithMedia = results.filter(r => r.medias.length > 0);
    expect(messagesWithMedia.length).toBe(8); // 5 from thick (26-30) + 3 from thin

    // Verify thread distribution
    const thickMessages = results.filter(
      r => r.message.thread === 'thick_thread',
    );
    const thinMessages = results.filter(
      r => r.message.thread === 'thin_thread',
    );
    expect(thickMessages.length).toBe(20);
    expect(thinMessages.length).toBe(10);
  });
});
