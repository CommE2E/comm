// @flow

import initSqlJs from 'sql.js';

import {
  createReportTable,
  getAllReports,
  removeAllReports,
  removeReports,
  updateReport,
} from './report-queries.js';
import { parseMultiStatementSQLiteResult } from '../utils/db-utils.js';

describe('Report Store queries', () => {
  let db;

  beforeAll(async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
    createReportTable(db);
  });

  beforeEach(() => {
    db.exec(`
      INSERT INTO reports VALUES ("1", "{report_content_1");
      INSERT INTO reports VALUES ("2", "{report_content_2}");
    `);
  });

  afterEach(() => {
    db.exec(`DELETE FROM reports`);
  });

  it('should create table', () => {
    const res = db.exec(`PRAGMA table_info(reports);`);
    const [parsedRes] = parseMultiStatementSQLiteResult(res);

    expect(parsedRes).toHaveLength(2);
    expect(parsedRes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          type: 'TEXT',
        }),
        expect.objectContaining({
          name: 'report',
          type: 'TEXT',
        }),
      ]),
    );
  });

  it('should return all reports', () => {
    const reports = getAllReports(db);
    expect(reports).toHaveLength(2);
  });

  it('should remove all reports', () => {
    removeAllReports(db);
    const reports = getAllReports(db);
    expect(reports).toHaveLength(0);
  });

  it('should insert not existing report', () => {
    const id = '3';
    const report = '{some_content}';
    updateReport(db, id, report);

    const reports = getAllReports(db);
    expect(reports).toHaveLength(3);
    expect(reports).toContainEqual({ id, report });
  });

  it('should reports with given id', () => {
    const id = '2';
    removeReports(db, [id]);

    const reports = getAllReports(db);
    expect(reports).toHaveLength(1);
    expect(reports).not.toContain(
      expect.objectContaining({
        id,
      }),
    );
  });
});
