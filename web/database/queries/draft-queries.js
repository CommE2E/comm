// @flow

import type { SqliteDatabase } from 'sql.js';

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

export { removeAllDrafts, updateDraft, moveDraft };
