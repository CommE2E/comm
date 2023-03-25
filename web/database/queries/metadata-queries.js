// @flow

import { SqliteDatabase } from 'sql.js';

import { parseMultiStatementSQLiteResult } from '../utils/db-utils.js';

type Metadata = {
  name: string,
  data?: string,
};

function setMetadata(db: SqliteDatabase, entryName: string, data: string) {
  const query = `
    INSERT OR REPLACE INTO metadata (name, data)
    VALUES ($entryName, $data)
  `;
  const params = {
    $entryName: entryName,
    $data: data,
  };

  db.exec(query, params);
}

function getMetadata(db: SqliteDatabase, entryName: string): ?string {
  const query = `
    SELECT * FROM metadata
    WHERE name = $entryName
  `;
  const params = {
    $entryName: entryName,
  };

  const rawResult = db.exec(query, params);
  const result = parseMultiStatementSQLiteResult<Metadata>(rawResult);
  if (result.length === 0 || result[0].length === 0) {
    return undefined;
  }
  const [entry] = result[0];
  return entry.data;
}

function clearMetadata(db: SqliteDatabase, entryName: string) {
  const query = `
    DELETE FROM metadata
    WHERE name = $entryName
  `;
  const params = {
    $entryName: entryName,
  };

  db.exec(query, params);
}

export { setMetadata, getMetadata, clearMetadata };
