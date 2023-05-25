// @flow

import { SqliteDatabase } from 'sql.js';

import { parseMultiStatementSQLiteResult } from '../utils/db-utils.js';

type Report = {
  id: string,
  report: string,
};

function createReportTable(db: SqliteDatabase) {
  const query = `
     CREATE TABLE IF NOT EXISTS reports (
       id TEXT UNIQUE PRIMARY KEY NOT NULL,
       report TEXT NOT NULL
     );
  `;

  db.exec(query);
}

function updateReport(db: SqliteDatabase, id: string, report: string) {
  const query = `
    INSERT OR REPLACE INTO reports (id, report)
    VALUES ($id, $report)
  `;
  const params = {
    $id: id,
    $report: report,
  };

  db.exec(query, params);
}

function getAllReports(db: SqliteDatabase): Report[] {
  const query = `
    SELECT *
    FROM reports
  `;

  const rawResult = db.exec(query);
  const result = parseMultiStatementSQLiteResult<Report>(rawResult);
  if (result.length === 0 || result[0].length === 0) {
    return [];
  }
  return result[0];
}

function removeReports(db: SqliteDatabase, ids: $ReadOnlyArray<string>) {
  const query = `
    DELETE FROM reports
    WHERE id IN ($ids)
  `;
  const params = {
    $ids: ids.join(', '),
  };

  db.exec(query, params);
}

function removeAllReports(db: SqliteDatabase) {
  db.exec(`DELETE FROM reports`);
}

export {
  createReportTable,
  updateReport,
  getAllReports,
  removeReports,
  removeAllReports,
};
