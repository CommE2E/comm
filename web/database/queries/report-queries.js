// @flow

import { SqliteDatabase } from 'sql.js';

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

function getAllReports(instance: any): Report[] {
  const vec = instance.getAllReports();
  const result = [];
  for (let i = 0; i < vec.size(); i += 1) {
    result.push(vec.get(i));
  }

  return result;
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
