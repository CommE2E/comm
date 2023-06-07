// @flow

import { getAllDrafts } from './draft-queries.js';
import Module from '../_generated/CommQueryCreator.js';

describe('Draft Store queries', () => {
  let instance;

  beforeAll(async () => {
    const module = Module();
    instance = new module.CommQueryCreator('test.sqlite');
  });

  beforeEach(() => {
    instance.updateDraft('thread_a', 'draft a');
    instance.updateDraft('thread_b', 'draft b');
  });

  afterEach(() => {
    instance.removeAllDrafts();
  });

  it('should return all drafts', () => {
    const drafts = getAllDrafts(instance);
    expect(drafts.length).toBe(2);
  });

  it('should remove all drafts', () => {
    instance.removeAllDrafts();
    const drafts = getAllDrafts(instance);
    expect(drafts.length).toBe(0);
  });

  it('should update draft text', () => {
    const key = 'thread_b';
    const text = 'updated message';
    instance.updateDraft(key, text);

    const drafts = getAllDrafts(instance);
    expect(drafts.length).toBe(2);

    const draft = drafts.find(d => d.key === key);
    expect(draft?.text).toBe(text);
  });

  it('should insert not existing draft', () => {
    const key = 'new_key';
    const text = 'some message';
    instance.updateDraft(key, text);

    const drafts = getAllDrafts(instance);
    expect(drafts.length).toBe(3);

    const draft = drafts.find(d => d.key === key);
    expect(draft?.text).toBe(text);
  });

  it('should move draft to a new key', () => {
    const newKey = 'new_key';
    const oldKey = 'thread_a';
    const draftText = 'draft a';
    instance.moveDraft(oldKey, newKey);

    const drafts = getAllDrafts(instance);
    expect(drafts.length).toBe(2);

    const oldKeyDraft = drafts.find(d => d.key === oldKey);
    expect(oldKeyDraft).toBeUndefined();

    const newKeyDraft = drafts.find(d => d.key === newKey);
    expect(newKeyDraft?.text).toBe(draftText);
  });

  it('should not change anything if oldKey not exists', () => {
    const newKey = 'new_key';
    const oldKey = 'missing_key';
    instance.moveDraft(oldKey, newKey);

    const drafts = getAllDrafts(instance);
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
    instance.moveDraft(oldKey, newKey);

    const drafts = getAllDrafts(instance);
    expect(drafts.length).toBe(1);

    const oldKeyDraft = drafts.find(d => d.key === oldKey);
    expect(oldKeyDraft).toBeUndefined();

    const newKeyDraft = drafts.find(d => d.key === newKey);
    expect(newKeyDraft?.text).toBe(draftText);
  });
});
