// @flow

import { messageTypes } from 'lib/types/message-types-enum.js';

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('getRelatedMessages queries', () => {
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

  const createTestMessage = (
    id: string,
    type: number,
    content?: ?string,
    targetMessageID?: string,
    time: number = 1000,
  ): void => {
    let messageContent = null;

    if (content) {
      messageContent = content;
    } else if (!targetMessageID) {
      messageContent = null;
    } else if (type === messageTypes.REACTION) {
      messageContent = JSON.stringify({
        targetMessageID,
        reaction: '👍',
        action: 'add_reaction',
      });
    } else if (type === messageTypes.EDIT_MESSAGE) {
      messageContent = JSON.stringify({
        targetMessageID,
        text: 'edited text',
      });
    } else if (type === messageTypes.DELETE_MESSAGE) {
      messageContent = JSON.stringify({
        targetMessageID,
      });
    } else if (type === messageTypes.TOGGLE_PIN) {
      messageContent = JSON.stringify({
        targetMessageID,
        action: 'pin',
        threadID: '1',
      });
    } else if (type === messageTypes.SIDEBAR_SOURCE) {
      messageContent = JSON.stringify({
        id: targetMessageID,
        type: messageTypes.TEXT,
        threadID: '1',
        creatorID: '1',
        time: 900,
        content: 'original message text',
      });
    }

    return queryExecutor.replaceMessage({
      id,
      localID: null,
      thread: '1',
      user: '1',
      type,
      futureType: null,
      content: messageContent,
      time: BigInt(time),
    });
  };

  const runBasicFunctionalityTests = () => {
    test('should handle non-existent message ID', () => {
      const results = queryExecutor.getRelatedMessages('nonexistent');
      expect(results.length).toBe(0);
    });

    test('should return the original message when queried', () => {
      createTestMessage('original', messageTypes.TEXT, 'Hello world');

      const results = queryExecutor.getRelatedMessages('original');
      expect(results.length).toBe(1);
      expect(results[0].message.id).toBe('original');
      expect(results[0].message.content).toBe('Hello world');
    });

    test('should handle malformed JSON content gracefully', () => {
      queryExecutor.replaceMessage({
        id: 'malformed',
        localID: null,
        thread: '1',
        user: '1',
        type: messageTypes.REACTION,
        futureType: null,
        content: 'invalid json{',
        time: BigInt(1000),
      });

      const results = queryExecutor.getRelatedMessages('malformed');
      expect(results.length).toBe(1);
      expect(results[0].message.id).toBe('malformed');
    });

    test('should handle null content', () => {
      createTestMessage('nullcontent', messageTypes.TEXT, null);

      const results = queryExecutor.getRelatedMessages('nullcontent');
      expect(results.length).toBe(1);
      expect(results[0].message.id).toBe('nullcontent');
    });
  };

  const runReactionRelationTests = () => {
    test('should find reaction targeting a message', () => {
      createTestMessage(
        'msg1',
        messageTypes.TEXT,
        'Hello world',
        undefined,
        1000,
      );
      createTestMessage(
        'reaction1',
        messageTypes.REACTION,
        undefined,
        'msg1',
        1100,
      );

      const results = queryExecutor.getRelatedMessages('msg1');
      expect(results.length).toBe(2);

      const messageIds = results.map(r => r.message.id).sort();
      expect(messageIds).toEqual(['msg1', 'reaction1']);

      const reaction = results.find(r => r.message.id === 'reaction1');
      expect(reaction?.message.type).toBe(messageTypes.REACTION);
      const reactionContent = JSON.parse(reaction?.message.content || '{}');
      expect(reactionContent.targetMessageID).toBe('msg1');
      expect(reactionContent.reaction).toBe('👍');
    });

    test('should find multiple reactions to same message', () => {
      createTestMessage(
        'msg1',
        messageTypes.TEXT,
        'Hello world',
        undefined,
        1000,
      );
      createTestMessage(
        'reaction1',
        messageTypes.REACTION,
        undefined,
        'msg1',
        1100,
      );
      createTestMessage(
        'reaction2',
        messageTypes.REACTION,
        undefined,
        'msg1',
        1200,
      );

      const results = queryExecutor.getRelatedMessages('msg1');
      expect(results.length).toBe(3);

      const reactionIds = results
        .filter(r => r.message.type === messageTypes.REACTION)
        .map(r => r.message.id)
        .sort();
      expect(reactionIds).toEqual(['reaction1', 'reaction2']);
    });
  };

  const runEditRelationTests = () => {
    test('should find edit message targeting original', () => {
      createTestMessage(
        'original',
        messageTypes.TEXT,
        'Original text',
        undefined,
        1000,
      );
      createTestMessage(
        'edit1',
        messageTypes.EDIT_MESSAGE,
        undefined,
        'original',
        1100,
      );

      const results = queryExecutor.getRelatedMessages('original');
      expect(results.length).toBe(2);

      const edit = results.find(r => r.message.id === 'edit1');
      expect(edit?.message.type).toBe(messageTypes.EDIT_MESSAGE);
      const editContent = JSON.parse(edit?.message.content || '{}');
      expect(editContent.targetMessageID).toBe('original');
      expect(editContent.text).toBe('edited text');
    });

    test('should find multiple edits to same message', () => {
      createTestMessage(
        'original',
        messageTypes.TEXT,
        'Original text',
        undefined,
        1000,
      );
      createTestMessage(
        'edit1',
        messageTypes.EDIT_MESSAGE,
        undefined,
        'original',
        1100,
      );
      createTestMessage(
        'edit2',
        messageTypes.EDIT_MESSAGE,
        undefined,
        'original',
        1200,
      );

      const results = queryExecutor.getRelatedMessages('original');
      expect(results.length).toBe(3);

      const edits = results.filter(
        r => r.message.type === messageTypes.EDIT_MESSAGE,
      );
      expect(edits.length).toBe(2);
    });
  };

  const runDeleteRelationTests = () => {
    test('should find delete message targeting original', () => {
      createTestMessage(
        'original',
        messageTypes.TEXT,
        'To be deleted',
        undefined,
        1000,
      );
      createTestMessage(
        'delete1',
        messageTypes.DELETE_MESSAGE,
        undefined,
        'original',
        1100,
      );

      const results = queryExecutor.getRelatedMessages('original');
      expect(results.length).toBe(2);

      const deleteMsg = results.find(r => r.message.id === 'delete1');
      expect(deleteMsg?.message.type).toBe(messageTypes.DELETE_MESSAGE);
      const deleteContent = JSON.parse(deleteMsg?.message.content || '{}');
      expect(deleteContent.targetMessageID).toBe('original');
    });
  };

  const runTogglePinRelationTests = () => {
    test('should find pin/unpin messages targeting original', () => {
      createTestMessage(
        'original',
        messageTypes.TEXT,
        'Message to pin',
        undefined,
        1000,
      );
      createTestMessage(
        'pin1',
        messageTypes.TOGGLE_PIN,
        undefined,
        'original',
        1100,
      );

      const results = queryExecutor.getRelatedMessages('original');
      expect(results.length).toBe(2);

      const pinMsg = results.find(r => r.message.id === 'pin1');
      expect(pinMsg?.message.type).toBe(messageTypes.TOGGLE_PIN);
      const pinContent = JSON.parse(pinMsg?.message.content || '{}');
      expect(pinContent.targetMessageID).toBe('original');
      expect(pinContent.action).toBe('pin');
    });
  };

  const runSidebarSourceRelationTests = () => {
    test('should find messages related to sidebar source', () => {
      createTestMessage(
        'original',
        messageTypes.TEXT,
        'Message for sidebar',
        undefined,
        1000,
      );
      createTestMessage(
        'sidebar1',
        messageTypes.SIDEBAR_SOURCE,
        undefined,
        'original',
        1000,
      );

      const results = queryExecutor.getRelatedMessages('original');
      expect(results.length).toBe(2);

      const sidebarMsg = results.find(r => r.message.id === 'sidebar1');
      expect(sidebarMsg?.message.type).toBe(messageTypes.SIDEBAR_SOURCE);
      const sidebarContent = JSON.parse(sidebarMsg?.message.content || '{}');
      expect(sidebarContent.id).toBe('original');
    });

    test('should handle sidebar source special case', () => {
      const sidebarContent = JSON.stringify({
        id: 'source_msg_id',
        type: messageTypes.TEXT,
        threadID: '1',
        creatorID: '1',
        time: 900,
        content: 'Source message for sidebar',
      });

      queryExecutor.replaceMessage({
        id: 'sidebar1',
        localID: null,
        thread: '1',
        user: '1',
        type: messageTypes.SIDEBAR_SOURCE,
        futureType: null,
        content: sidebarContent,
        time: BigInt(1000),
      });

      const results = queryExecutor.getRelatedMessages('source_msg_id');
      expect(results.length).toBe(1);
      expect(results[0].message.id).toBe('sidebar1');
      expect(results[0].message.type).toBe(messageTypes.SIDEBAR_SOURCE);
    });
  };

  const runComplexScenarioTests = () => {
    test('should handle message with multiple types of relations', () => {
      createTestMessage(
        'original',
        messageTypes.TEXT,
        'Popular message',
        undefined,
        1000,
      );
      createTestMessage(
        'reaction1',
        messageTypes.REACTION,
        undefined,
        'original',
        1100,
      );
      createTestMessage(
        'reaction2',
        messageTypes.REACTION,
        undefined,
        'original',
        1150,
      );
      createTestMessage(
        'edit1',
        messageTypes.EDIT_MESSAGE,
        undefined,
        'original',
        1200,
      );
      createTestMessage(
        'pin1',
        messageTypes.TOGGLE_PIN,
        undefined,
        'original',
        1300,
      );

      const results = queryExecutor.getRelatedMessages('original');
      expect(results.length).toBe(5);

      const types = results.map(r => r.message.type).sort();
      expect(types).toEqual(
        [
          messageTypes.TEXT,
          messageTypes.REACTION,
          messageTypes.REACTION,
          messageTypes.EDIT_MESSAGE,
          messageTypes.TOGGLE_PIN,
        ].sort(),
      );
    });

    test('should not return unrelated messages', () => {
      createTestMessage(
        'msg1',
        messageTypes.TEXT,
        'Message 1',
        undefined,
        1000,
      );
      createTestMessage(
        'msg2',
        messageTypes.TEXT,
        'Message 2',
        undefined,
        1100,
      );
      createTestMessage(
        'reaction1',
        messageTypes.REACTION,
        undefined,
        'msg1',
        1200,
      );
      createTestMessage(
        'edit1',
        messageTypes.EDIT_MESSAGE,
        undefined,
        'msg2',
        1300,
      );

      const results1 = queryExecutor.getRelatedMessages('msg1');
      expect(results1.length).toBe(2);
      const ids1 = results1.map(r => r.message.id).sort();
      expect(ids1).toEqual(['msg1', 'reaction1']);

      const results2 = queryExecutor.getRelatedMessages('msg2');
      expect(results2.length).toBe(2);
      const ids2 = results2.map(r => r.message.id).sort();
      expect(ids2).toEqual(['edit1', 'msg2']);
    });
  };

  const runOrderingTests = () => {
    test('should return messages ordered by time DESC', () => {
      createTestMessage(
        'original',
        messageTypes.TEXT,
        'Original',
        undefined,
        1000,
      );
      createTestMessage(
        'reaction1',
        messageTypes.REACTION,
        undefined,
        'original',
        1500,
      );
      createTestMessage(
        'edit1',
        messageTypes.EDIT_MESSAGE,
        undefined,
        'original',
        1200,
      );
      createTestMessage(
        'reaction2',
        messageTypes.REACTION,
        undefined,
        'original',
        1800,
      );

      const results = queryExecutor.getRelatedMessages('original');
      expect(results.length).toBe(4);

      const times = results.map(r => Number(r.message.time));
      expect(times).toEqual([1800, 1500, 1200, 1000]);

      const ids = results.map(r => r.message.id);
      expect(ids).toEqual(['reaction2', 'reaction1', 'edit1', 'original']);
    });
  };

  const runAllMessageTypesTests = () => {
    test('should handle all message types that support targetMessageID', () => {
      createTestMessage(
        'target',
        messageTypes.TEXT,
        'Target message',
        undefined,
        1000,
      );

      const targetingTypes = [
        messageTypes.REACTION,
        messageTypes.EDIT_MESSAGE,
        messageTypes.DELETE_MESSAGE,
        messageTypes.TOGGLE_PIN,
      ];

      targetingTypes.forEach((type, index) => {
        createTestMessage(
          `msg_${type}`,
          type,
          undefined,
          'target',
          1100 + index * 100,
        );
      });

      const results = queryExecutor.getRelatedMessages('target');
      expect(results.length).toBe(1 + targetingTypes.length);

      const foundTypes = results.map(r => r.message.type).sort();
      const expectedTypes = [messageTypes.TEXT, ...targetingTypes].sort();
      expect(foundTypes).toEqual(expectedTypes);
    });
  };

  describe('Run all tests', () => {
    describe('Basic functionality', runBasicFunctionalityTests);
    describe('Reaction message relations', runReactionRelationTests);
    describe('Edit message relations', runEditRelationTests);
    describe('Delete message relations', runDeleteRelationTests);
    describe('Toggle pin message relations', runTogglePinRelationTests);
    describe('Sidebar source message relations', runSidebarSourceRelationTests);
    describe('Complex relationship scenarios', runComplexScenarioTests);
    describe('Message ordering', runOrderingTests);
    describe('All message types coverage', runAllMessageTypesTests);
  });
});
