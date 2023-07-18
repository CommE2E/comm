// @flow

import { getDatabaseModule } from '../db-module.js';

describe('Draft Store queries', () => {
  let queryExecutor;

  beforeAll(async () => {
    const module = getDatabaseModule();
    queryExecutor = new module.SQLiteQueryExecutor('test.sqlite');
  });

  beforeEach(() => {
    queryExecutor.updateDraft('thread_a', 'draft a');
    queryExecutor.updateDraft('thread_b', 'draft b');
  });

  afterEach(() => {
    queryExecutor.removeAllDrafts();
  });

  it('should return all drafts', () => {
    const drafts = queryExecutor.getAllDrafts();
    expect(drafts.length).toBe(2);
  });

  it('should remove all drafts', () => {
    queryExecutor.removeAllDrafts();
    const drafts = queryExecutor.getAllDrafts();
    console.log(drafts);
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
});
