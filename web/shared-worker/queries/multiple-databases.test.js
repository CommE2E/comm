// @flow

import { getProtocolByThreadID } from 'lib/shared/threads/protocols/thread-protocols.js';
import { messageTypes } from 'lib/types/message-types-enum.js';

import { getDatabaseModule } from '../db-module.js';
import type { WebMessage } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const MAIN_FILE_PATH = 'main.sqlite';
const BACKUP_FILE_PATH = 'backup.sqlite';

const METADATA_KEY = 'test_key';
const METADATA_DEFAULT_VALUE_BACKUP = 'default_value';
const METADATA_DEFAULT_VALUE_MAIN = '';

describe('Multiple databases', () => {
  let mainQueryExecutor, backupQueryExecutor;
  let dbModule;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    mainQueryExecutor = new dbModule.SQLiteQueryExecutor(MAIN_FILE_PATH, false);
    if (!mainQueryExecutor) {
      throw new Error('Main SQLiteQueryExecutor is missing');
    }

    backupQueryExecutor = new dbModule.SQLiteQueryExecutor(
      BACKUP_FILE_PATH,
      false,
    );
    if (!backupQueryExecutor) {
      throw new Error('Backup SQLiteQueryExecutor is missing');
    }

    backupQueryExecutor.setMetadata(
      METADATA_KEY,
      METADATA_DEFAULT_VALUE_BACKUP,
    );
  });

  afterEach(() => {
    if (!dbModule) {
      return;
    }
    if (mainQueryExecutor) {
      clearSensitiveData(dbModule, MAIN_FILE_PATH, mainQueryExecutor);
    }
    if (backupQueryExecutor) {
      clearSensitiveData(dbModule, BACKUP_FILE_PATH, backupQueryExecutor);
    }
  });

  it('changes in one database should not affect other', () => {
    const customValue = 'custom_value;';
    mainQueryExecutor?.setMetadata(METADATA_KEY, customValue);

    expect(mainQueryExecutor.getMetadata(METADATA_KEY)).toBe(customValue);

    // set in `beforeEach`
    expect(backupQueryExecutor.getMetadata(METADATA_KEY)).toBe(
      METADATA_DEFAULT_VALUE_BACKUP,
    );
  });

  it('copies content between databases', () => {
    expect(mainQueryExecutor.getMetadata(METADATA_KEY)).toBe(
      METADATA_DEFAULT_VALUE_MAIN,
    );

    // should not copy content that is not in `tablesAllowlist`
    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);
    expect(mainQueryExecutor.getMetadata(METADATA_KEY)).toBe(
      METADATA_DEFAULT_VALUE_MAIN,
    );

    const draftKey = 'conversation_id';
    const draftContent = 'typed_message';
    backupQueryExecutor.updateDraft(draftKey, draftContent);

    let draft;
    // present in backup
    draft = backupQueryExecutor.getAllDrafts().find(d => d.key === draftKey);
    expect(draft?.text).toBe(draftContent);
    // missing in main
    draft = mainQueryExecutor.getAllDrafts().find(d => d.key === draftKey);
    expect(draft).toBeUndefined();

    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);
    // present in backup
    draft = backupQueryExecutor.getAllDrafts().find(d => d.key === draftKey);
    expect(draft?.text).toBe(draftContent);
    // present in backup
    draft = mainQueryExecutor.getAllDrafts().find(d => d.key === draftKey);
    expect(draft?.text).toBe(draftContent);
  });

  it('do not override content from main database', () => {
    const draftKey = 'conversation_id';
    const mainDraftContent = 'main_draft';
    const backupDraftContent = 'backup_draft';
    mainQueryExecutor.updateDraft(draftKey, mainDraftContent);
    backupQueryExecutor.updateDraft(draftKey, backupDraftContent);

    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);

    const mainDraft = mainQueryExecutor
      .getAllDrafts()
      .find(d => d.key === draftKey);

    expect(mainDraft?.text).toBe(mainDraftContent);

    const backupDraft = backupQueryExecutor
      .getAllDrafts()
      .find(d => d.key === draftKey);
    expect(backupDraft?.text).toBe(backupDraftContent);
  });

  it('returns correct database version', () => {
    const migratedFilePath = 'migrated.sqlite';
    const migratedQueryExecutor = new dbModule.SQLiteQueryExecutor(
      migratedFilePath,
      false,
    );
    expect(migratedQueryExecutor.getDatabaseVersion()).toBeGreaterThan(0);
    clearSensitiveData(dbModule, migratedFilePath, migratedQueryExecutor);

    const notMigratedFilePath = 'not-migrated.sqlite';
    const notMigratedQueryExecutor = new dbModule.SQLiteQueryExecutor(
      notMigratedFilePath,
      true,
    );
    expect(notMigratedQueryExecutor.getDatabaseVersion()).toBe(0);
    clearSensitiveData(dbModule, notMigratedFilePath, notMigratedQueryExecutor);
  });

  it('populates message_search table for TEXT messages during copy', () => {
    const threadID = '40db5619-feb2-4e5f-bd0c-1f9a709d366e';
    const messageID = 'test-message-id';
    const messageContent = 'Hello world test message';

    const message: WebMessage = {
      id: messageID,
      localID: null,
      thread: threadID,
      user: '111',
      type: messageTypes.TEXT,
      futureType: null,
      content: messageContent,
      time: BigInt(123),
    };

    // Add message to the backup database
    backupQueryExecutor.replaceMessage(
      message,
      !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
    );

    // Verify message is not searchable in main database before copy
    let searchResults = mainQueryExecutor.searchMessages(
      'Hello',
      threadID,
      null,
      null,
    );
    expect(searchResults.length).toBe(0);

    // Copy content from backup to main
    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);

    // Verify message is now searchable in main database
    searchResults = mainQueryExecutor.searchMessages(
      'Hello',
      threadID,
      null,
      null,
    );
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].message.id).toBe(messageID);
    expect(searchResults[0].message.content).toBe(messageContent);
  });

  it('populates message_search table for EDIT_MESSAGE messages during copy', () => {
    const threadID = '40db5619-feb2-4e5f-bd0c-1f9a709d366e';
    const originalMessageID = 'original-message-id';
    const editMessageID = 'edit-message-id';
    const editContent = JSON.stringify({
      targetMessageID: originalMessageID,
      text: 'edited text',
    });

    const originalMessage: WebMessage = {
      id: originalMessageID,
      localID: null,
      thread: threadID,
      user: '111',
      type: messageTypes.TEXT,
      futureType: null,
      content: 'Original content',
      time: BigInt(100),
    };

    const editMessage: WebMessage = {
      id: editMessageID,
      localID: null,
      thread: threadID,
      user: '111',
      type: messageTypes.EDIT_MESSAGE,
      futureType: null,
      content: editContent,
      time: BigInt(200),
    };

    // Add messages to backup database
    backupQueryExecutor.replaceMessage(
      originalMessage,
      !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
    );
    backupQueryExecutor.replaceMessage(
      editMessage,
      !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
    );

    // Copy content from backup to main
    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);

    // Verify edit message is searchable
    // Should find the edit and original message content
    const searchResults = mainQueryExecutor.searchMessages(
      'edited',
      threadID,
      null,
      null,
    );
    expect(searchResults.length).toBe(2);
    expect(searchResults[0].message.id).toBe(originalMessageID);
    expect(searchResults[1].message.id).toBe(editMessageID);
  });

  it('removes DELETE_MESSAGE entries from existing message_search during copy', () => {
    const threadID = '40db5619-feb2-4e5f-bd0c-1f9a709d366e';
    const messageID = 'message-to-delete';

    // First, add a TEXT message that gets indexed
    const textMessage: WebMessage = {
      id: messageID,
      localID: null,
      thread: threadID,
      user: '111',
      type: messageTypes.TEXT,
      futureType: null,
      content: 'This message will be deleted',
      time: BigInt(100),
    };

    mainQueryExecutor.replaceMessage(
      textMessage,
      !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
    );
    mainQueryExecutor.updateMessageSearchIndex(
      messageID,
      messageID,
      'This message will be deleted',
    );

    // Verify message is searchable
    let searchResults = mainQueryExecutor.searchMessages(
      'deleted',
      threadID,
      null,
      null,
    );
    expect(searchResults.length).toBe(1);

    const deleteMessage: WebMessage = {
      id: 'delete-message-id',
      localID: null,
      thread: threadID,
      user: '111',
      type: messageTypes.DELETE_MESSAGE,
      futureType: null,
      content: JSON.stringify({ targetMessageID: messageID }),
      time: BigInt(300),
    };

    backupQueryExecutor.replaceMessage(
      deleteMessage,
      !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
    );

    // Copy content from backup to main
    // This should remove the search index entry
    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);

    // Verify message is no longer searchable
    searchResults = mainQueryExecutor.searchMessages(
      'deleted',
      threadID,
      null,
      null,
    );
    expect(searchResults.length).toBe(0);
  });

  it('handles EDIT_MESSAGE and DELETE_MESSAGE with invalid JSON gracefully', () => {
    const threadID = '40db5619-feb2-4e5f-bd0c-1f9a709d366e';
    const originalMessageID = 'original-message-id';

    // Add original TEXT message that gets indexed
    const originalMessage: WebMessage = {
      id: originalMessageID,
      localID: null,
      thread: threadID,
      user: '111',
      type: messageTypes.TEXT,
      futureType: null,
      content: 'Original message to edit',
      time: BigInt(100),
    };

    backupQueryExecutor.replaceMessage(
      originalMessage,
      !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
    );

    // Add EDIT_MESSAGE with invalid JSON
    const invalidEditMessage: WebMessage = {
      id: 'invalid-edit-id',
      localID: null,
      thread: threadID,
      user: '111',
      type: messageTypes.EDIT_MESSAGE,
      futureType: null,
      content: 'invalid json { broken',
      time: BigInt(200),
    };

    // Add DELETE_MESSAGE with invalid JSON
    const invalidDeleteMessage: WebMessage = {
      id: 'invalid-delete-id',
      localID: null,
      thread: threadID,
      user: '111',
      type: messageTypes.DELETE_MESSAGE,
      futureType: null,
      content: 'also invalid json } broken',
      time: BigInt(300),
    };

    backupQueryExecutor.replaceMessage(
      invalidEditMessage,
      !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
    );
    backupQueryExecutor.replaceMessage(
      invalidDeleteMessage,
      !!getProtocolByThreadID(threadID)?.dataIsBackedUp,
    );

    // Copy content - should not fail despite invalid
    // JSON in EDIT/DELETE messages
    expect(() => {
      mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);
    }).not.toThrow();

    // Original message should still be searchable (invalid EDIT/DELETE ignored)
    const searchResults = mainQueryExecutor.searchMessages(
      'Original',
      threadID,
      null,
      null,
    );
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].message.id).toBe(originalMessageID);
  });

  it('copies queued_dm_operations with new autoincrement IDs', () => {
    // Test operations to add to backup database
    const testOperations = [
      {
        queueType: 'thread',
        queueKey: 'thread123',
        operationData: '{"type":"send_text_message","text":"Hello"}',
        timestamp: '1642500000000',
      },
      {
        queueType: 'membership',
        queueKey: 'thread456#user789',
        operationData: '{"type":"add_members","userIDs":["user789"]}',
        timestamp: '1642500001000',
      },
      {
        queueType: 'message',
        queueKey: 'msg101',
        operationData: '{"type":"send_reaction","reaction":"👍"}',
        timestamp: '1642500002000',
      },
    ];

    // Add operations to backup database
    testOperations.forEach(op => {
      backupQueryExecutor.addQueuedDMOperation(op);
    });

    // Verify operations exist in backup
    const backupOperations = backupQueryExecutor.getQueuedDMOperations();
    expect(backupOperations.length).toBe(3);

    // Verify main database is empty
    let mainOperations = mainQueryExecutor.getQueuedDMOperations();
    expect(mainOperations.length).toBe(0);

    // Copy content from backup to main
    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);

    // Verify operations were copied to main database
    mainOperations = mainQueryExecutor.getQueuedDMOperations();
    expect(mainOperations.length).toBe(3);
  });
});
