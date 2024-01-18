// @flow

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
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    queryExecutor.replaceMessageWeb({
      id: '1',
      localID: { value: '', isNull: true },
      thread: '1',
      user: '1',
      type: 0,
      futureType: { value: 0, isNull: true },
      content: { value: '', isNull: true },
      time: '0',
    });
    queryExecutor.replaceMessageWeb({
      id: '2',
      localID: { value: '', isNull: true },
      thread: '1',
      user: '1',
      type: 0,
      futureType: { value: 0, isNull: true },
      content: { value: '', isNull: true },
      time: '0',
    });
    queryExecutor.replaceMessageWeb({
      id: '3',
      localID: { value: '', isNull: true },
      thread: '2',
      user: '1',
      type: 0,
      futureType: { value: 0, isNull: true },
      content: { value: '', isNull: true },
      time: '0',
    });
    queryExecutor.replaceMedia({
      id: '1',
      container: '1',
      thread: '1',
      uri: '1',
      type: '1',
      extras: '1',
    });
    queryExecutor.replaceMedia({
      id: '2',
      container: '1',
      thread: '1',
      uri: '1',
      type: '1',
      extras: '1',
    });
    queryExecutor.replaceMedia({
      id: '3',
      container: '3',
      thread: '2',
      uri: '1',
      type: '1',
      extras: '1',
    });
    queryExecutor.replaceMedia({
      id: '4',
      container: '3',
      thread: '2',
      uri: '1',
      type: '1',
      extras: '1',
    });
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all messages with media', () => {
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages.length).toBe(3);
    expect(allMessages[0].medias.length).toBe(2);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(2);
  });

  it('should remove all messages', () => {
    queryExecutor.removeAllMessages();
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages.length).toBe(0);
  });

  it('should remove all media', () => {
    queryExecutor.removeAllMedia();
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages[0].medias.length).toBe(0);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(0);
  });

  it('should remove all messages for threads', () => {
    queryExecutor.removeMessagesForThreads(['1']);
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages.length).toBe(1);
  });

  it('should remove all messages with ids', () => {
    queryExecutor.removeMessages(['1']);
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages.length).toBe(2);
  });

  it('should remove all media for message', () => {
    queryExecutor.removeMediaForMessage('1');
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages[0].medias.length).toBe(0);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(2);
  });

  it('should remove all media for messages', () => {
    queryExecutor.removeMediaForMessages(['3']);
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages[0].medias.length).toBe(2);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(0);
  });

  it('should remove all media for threads', () => {
    queryExecutor.removeMediaForThreads(['2']);
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages[0].medias.length).toBe(2);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(0);
  });

  it('should rekey media containers', () => {
    queryExecutor.rekeyMediaContainers('1', '3');
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages[0].medias.length).toBe(0);
    expect(allMessages[1].medias.length).toBe(0);
    expect(allMessages[2].medias.length).toBe(4);
  });

  it('should rekey message', () => {
    queryExecutor.rekeyMessage('3', '2');
    const allMessages = queryExecutor.getAllMessagesWeb();
    expect(allMessages.length).toBe(2);
    const rekeyedMessage = allMessages.filter(
      messageWithMedia => messageWithMedia.message.id === '2',
    )[0];
    expect(rekeyedMessage.message.thread).toBe('2');
  });
});
