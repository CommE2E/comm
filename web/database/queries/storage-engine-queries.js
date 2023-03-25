// @flow

import { SqliteDatabase } from 'sql.js';

import { parseMultiStatementSQLiteResult } from '../utils/db-utils.js';

type Entry = {
  key: string,
  item: string,
};

function setPersistStorageItem(db: SqliteDatabase, key: string, item: string) {
  const query = `
    INSERT OR REPLACE INTO persist_storage (key, item)
    VALUES ($key, $item)
  `;
  const params = {
    $key: key,
    $item: item,
  };

  db.exec(query, params);
}

function getPersistStorageItem(db: SqliteDatabase, key: string): string {
  const query = `
    SELECT * 
    FROM persist_storage
    WHERE key = $key
  `;
  const params = {
    $key: key,
  };

  const rawResult = db.exec(query, params);
  const result = parseMultiStatementSQLiteResult<Entry>(rawResult);
  if (result.length === 0 || result[0].length === 0) {
    return '';
  }
  const [entry] = result[0];
  return entry.item;
}

function removePersistStorageItem(db: SqliteDatabase, key: string) {
  const query = `
    DELETE FROM persist_storage
    WHERE key = $key
  `;
  const params = {
    $key: key,
  };

  db.exec(query, params);
}

export {
  setPersistStorageItem,
  getPersistStorageItem,
  removePersistStorageItem,
};
