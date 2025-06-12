// @flow

import { threadTypes } from 'lib/types/thread-types-enum.js';

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Message and media store queries', () => {
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
    queryExecutor.replaceMessage(
      {
        id: '1',
        localID: null,
        thread: '1',
        user: '1',
        type: 0,
        futureType: null,
        content: null,
        time: BigInt(0),
      },
      false,
    );
    queryExecutor.replaceMessage(
      {
        id: '2',
        localID: null,
        thread: '1',
        user: '1',
        type: 0,
        futureType: null,
        content: null,
        time: BigInt(0),
      },
      false,
    );
    queryExecutor.replaceMessage(
      {
        id: '3',
        localID: null,
        thread: '2',
        user: '1',
        type: 0,
        futureType: 5,
        content: null,
        time: BigInt(0),
      },
      false,
    );
    queryExecutor.replaceMedia(
      {
        id: '1',
        container: '1',
        thread: '1',
        uri: '1',
        type: 'photo',
        extras: '1',
      },
      false,
    );
    queryExecutor.replaceMedia(
      {
        id: '2',
        container: '1',
        thread: '1',
        uri: '1',
        type: 'photo',
        extras: '1',
      },
      false,
    );
    queryExecutor.replaceMedia(
      {
        id: '3',
        container: '3',
        thread: '2',
        uri: '1',
        type: 'photo',
        extras: '1',
      },
      false,
    );
    queryExecutor.replaceMedia(
      {
        id: '4',
        container: '3',
        thread: '2',
        uri: '1',
        type: 'photo',
        extras: '1',
      },
      false,
    );
    queryExecutor.replaceThread(
      {
        id: '1',
        type: threadTypes.COMMUNITY_OPEN_SUBTHREAD,
        name: null,
        avatar: null,
        description: null,
        color: 'ffffff',
        creationTime: BigInt(1),
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
    queryExecutor.replaceThread(
      {
        id: '2',
        type: threadTypes.COMMUNITY_OPEN_SUBTHREAD,
        name: null,
        avatar: null,
        description: null,
        color: 'ffffff',
        creationTime: BigInt(1),
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
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all messages with media', () => {
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages.length).toBe(3);
    expect(allMessages[0].medias.length).toBe(2);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(2);
  });

  it('should remove all messages', () => {
    queryExecutor.removeAllMessages();
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages.length).toBe(0);
  });

  it('should remove all media', () => {
    queryExecutor.removeAllMedia();
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages[0].medias.length).toBe(0);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(0);
  });

  it('should remove all messages for threads', () => {
    queryExecutor.removeMessagesForThreads(['1']);
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages.length).toBe(1);
  });

  it('should remove all messages with ids', () => {
    queryExecutor.removeMessages(['1']);
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages.length).toBe(2);
  });

  it('should remove all media for message', () => {
    queryExecutor.removeMediaForMessage('1');
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages[0].medias.length).toBe(0);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(2);
  });

  it('should remove all media for messages', () => {
    queryExecutor.removeMediaForMessages(['3']);
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages[0].medias.length).toBe(2);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(0);
  });

  it('should remove all media for threads', () => {
    queryExecutor.removeMediaForThreads(['2']);
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages[0].medias.length).toBe(2);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(0);
  });

  it('should rekey media containers', () => {
    queryExecutor.rekeyMediaContainers('1', '3');
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages[0].medias.length).toBe(0);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(4);
  });

  it('should rekey message', () => {
    queryExecutor.rekeyMessage('3', '2');
    const allMessages = queryExecutor.getInitialMessages();
    expect(allMessages.length).toBe(2);
    const rekeyedMessage = allMessages.find(
      messageWithMedia => messageWithMedia.message.id === '2',
    );
    expect(rekeyedMessage?.message.thread).toBe('2');
  });

  it('should correctly handle nullable integer', () => {
    const allMessages = queryExecutor.getInitialMessages();
    const messageWithNullFutureType = allMessages.find(
      messageWithMedia => messageWithMedia.message.id === '1',
    );
    const messageWithNonNullIFutureType = allMessages.find(
      messageWithMedia => messageWithMedia.message.id === '3',
    );
    expect(messageWithNullFutureType?.message.futureType).toBeDefined();
    expect(messageWithNonNullIFutureType?.message.futureType).toBe(5);
  });
});
