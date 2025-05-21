// @flow

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Draft Store queries', () => {
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
    queryExecutor.updateDraft('thread_a', 'draft a');
    queryExecutor.updateDraft('thread_b', 'draft b');
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all drafts', () => {
    const drafts = queryExecutor.getAllDrafts();
    expect(drafts.length).toBe(2);
  });

  it('should remove all drafts', () => {
    queryExecutor.removeAllDrafts();
    const drafts = queryExecutor.getAllDrafts();
    expect(drafts.length).toBe(0);
  });

  it('should update draft text', () => {
    const key = 'thread_b';
    const text = 'updated message';
    queryExecutor.updateDraft(key, text);

    const drafts = queryExecutor.getAllDrafts();
    expect(drafts.length).toBe(2);

    const draft = drafts.find(d => d.key === key);
    expect(draft?.text).toBe(text);
  });

  it('should insert not existing draft', () => {
    const key = 'new_key';
    const text = 'some message';
    queryExecutor.updateDraft(key, text);

    const drafts = queryExecutor.getAllDrafts();
    expect(drafts.length).toBe(3);

    const draft = drafts.find(d => d.key === key);
    expect(draft?.text).toBe(text);
  });

  it('should move draft to a new key', () => {
    const newKey = 'new_key';
    const oldKey = 'thread_a';
    const draftText = 'draft a';
    queryExecutor.moveDraft(oldKey, newKey);

    const drafts = queryExecutor.getAllDrafts();
    expect(drafts.length).toBe(2);

    const oldKeyDraft = drafts.find(d => d.key === oldKey);
    expect(oldKeyDraft).toBeUndefined();

    const newKeyDraft = drafts.find(d => d.key === newKey);
    expect(newKeyDraft?.text).toBe(draftText);
  });

  it('should not change anything if oldKey not exists', () => {
    const newKey = 'new_key';
    const oldKey = 'missing_key';
    queryExecutor.moveDraft(oldKey, newKey);

    const drafts = queryExecutor.getAllDrafts();
    expect(drafts.length).toBe(2);

    const oldKeyDraft = drafts.find(d => d.key === oldKey);
    expect(oldKeyDraft).toBeUndefined();

    const newKeyDraft = drafts.find(d => d.key === newKey);
    expect(newKeyDraft).toBeUndefined();
  });

  it('should move and replace if newKey exists', () => {
    const newKey = 'thread_b';
    const oldKey = 'thread_a';
    const draftText = 'draft a';
    queryExecutor.moveDraft(oldKey, newKey);

    const drafts = queryExecutor.getAllDrafts();
    expect(drafts.length).toBe(1);

    const oldKeyDraft = drafts.find(d => d.key === oldKey);
    expect(oldKeyDraft).toBeUndefined();

    const newKeyDraft = drafts.find(d => d.key === newKey);
    expect(newKeyDraft?.text).toBe(draftText);
  });

  it('should remove drafts with specified keys', () => {
    queryExecutor.removeDrafts(['thread_a']);
    const drafts = queryExecutor.getAllDrafts();
    expect(drafts).toEqual([{ key: 'thread_b', text: 'draft b' }]);
  });
});
