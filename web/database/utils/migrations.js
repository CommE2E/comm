// @flow

import type { SqliteDatabase } from 'sql.js';

const migrations: $ReadOnlyMap<number, (sqliteDb: SqliteDatabase) => void> =
  new Map([]);

export { migrations };
