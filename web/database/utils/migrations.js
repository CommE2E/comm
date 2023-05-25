// @flow

import type { SqliteDatabase } from 'sql.js';

import { createReportTable } from '../queries/report-queries.js';

const migrations: $ReadOnlyMap<number, (sqliteDb: SqliteDatabase) => void> =
  new Map([
    [
      1,
      (sqliteDb: SqliteDatabase) => {
        createReportTable(sqliteDb);
      },
    ],
  ]);

export { migrations };
