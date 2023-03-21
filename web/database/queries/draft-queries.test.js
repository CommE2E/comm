// @flow

import initSqlJs from 'sql.js';

import { setupSQLiteDB } from './db-queries.js';
import {
  getAllDrafts,
  moveDraft,
  removeAllDrafts,
  updateDraft,
} from './draft-queries.js';

describe('Draft Store queries', () => {
  let db;

  beforeAll(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
  });

  beforeEach(() => {
    setupSQLiteDB(db);
    db.exec(`
      INSERT INTO drafts VALUES ("thread_a", "draft a");
      INSERT INTO drafts VALUES ("thread_b", "draft b");
    `);
  });

  afterEach(() => {
    db.exec(`DELETE FROM drafts`);
  });

  it('should return all drafts', () => {
    const drafts = getAllDrafts(db);
    expect(drafts.length).toBe(2);
  });

  it('should remove all drafts', () => {
    removeAllDrafts(db);
    const drafts = getAllDrafts(db);
    expect(drafts.length).toBe(0);
  });

  it('should update draft text', () => {
    const key = 'thread_b';
    const text = 'updated message';
    updateDraft(db, key, text);

    const drafts = getAllDrafts(db);
    expect(drafts.length).toBe(2);

    const draft = drafts.find(d => d.key === key);
    expect(draft?.text).toBe(text);
  });

  it('should insert not existing draft', () => {
    const key = 'new_key';
    const text = 'some message';
    updateDraft(db, key, text);

    const drafts = getAllDrafts(db);
    expect(drafts.length).toBe(3);

    const draft = drafts.find(d => d.key === key);
    expect(draft?.text).toBe(text);
  });

  it('should move draft to a new key', () => {
    const newKey = 'new_key';
    const oldKey = 'thread_a';
    const draftText = 'draft a';
    moveDraft(db, oldKey, newKey);

    const drafts = getAllDrafts(db);
    expect(drafts.length).toBe(2);

    const oldKeyDraft = drafts.find(d => d.key === oldKey);
    expect(oldKeyDraft).toBeUndefined();

    const newKeyDraft = drafts.find(d => d.key === newKey);
    expect(newKeyDraft?.text).toBe(draftText);
  });

  it('should not change anything if oldKey not exists', () => {
    const newKey = 'new_key';
    const oldKey = 'missing_key';
    moveDraft(db, oldKey, newKey);

    const drafts = getAllDrafts(db);
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
    moveDraft(db, oldKey, newKey);

    const drafts = getAllDrafts(db);
    expect(drafts.length).toBe(1);

    const oldKeyDraft = drafts.find(d => d.key === oldKey);
    expect(oldKeyDraft).toBeUndefined();

    const newKeyDraft = drafts.find(d => d.key === newKey);
    expect(newKeyDraft?.text).toBe(draftText);
  });
});
