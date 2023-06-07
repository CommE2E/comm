// @flow

import { SqliteDatabase } from 'sql.js';

import type { ClientDBDraftInfo } from 'lib/types/draft-types.js';

import { parseMultiStatementSQLiteResult } from '../utils/db-utils.js';

function removeAllDrafts(db: SqliteDatabase) {
  db.exec(`DELETE FROM drafts`);
}

function updateDraft(db: SqliteDatabase, key: string, text: string) {
  const query = `
    INSERT OR REPLACE INTO drafts (key, text)
    VALUES ($key, $text)
  `;
  const params = {
    $key: key,
    $text: text,
  };

  db.exec(query, params);
}

function moveDraft(db: SqliteDatabase, oldKey: string, newKey: string) {
  const query = `
    UPDATE OR REPLACE drafts
    SET key = $newKey, text = (SELECT text FROM drafts WHERE key = $oldKey)
    WHERE key = $oldKey
  `;
  const params = {
    $newKey: newKey,
    $oldKey: oldKey,
  };

  db.exec(query, params);
}

//TODO refactor this
function getAllDrafts(instance: any): ClientDBDraftInfo[] {
  const vec = instance.getAllDrafts();
  const result = [];
  for (let i = 0; i < vec.size(); i += 1) {
    result.push(vec.get(i));
  }

  return result;
}

export { removeAllDrafts, updateDraft, moveDraft, getAllDrafts };
