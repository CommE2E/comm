// @flow

import { getDatabaseModule } from '../db-module.js';

describe('Report Store queries', () => {
  let queryExecutor;

  beforeAll(async () => {
    const module = getDatabaseModule();
    queryExecutor = new module.SQLiteQueryExecutor('test.sqlite');
  });

  beforeEach(() => {
    queryExecutor.replaceReport({ id: '1', report: '{report_content_1}' });
    queryExecutor.replaceReport({ id: '2', report: '{report_content_2}' });
  });

  afterEach(() => {
    queryExecutor.removeAllReports();
  });

  it('should return all reports', () => {
    const reports = queryExecutor.getAllReports();
    expect(reports).toHaveLength(2);
  });

  it('should remove all reports', () => {
    queryExecutor.removeAllReports();
    const reports = queryExecutor.getAllReports();
    expect(reports).toHaveLength(0);
  });

  it('should insert not existing report', () => {
    const id = '3';
    const report = '{some_content}';
    queryExecutor.replaceReport({ id, report });

    const reports = queryExecutor.getAllReports();
    expect(reports).toHaveLength(3);
    expect(reports).toContainEqual({ id, report });
  });

  it('should reports with given id', () => {
    const id = '2';
    queryExecutor.removeReports([id]);

    const reports = queryExecutor.getAllReports();
    expect(reports).toHaveLength(1);
    expect(reports).not.toContain(
      expect.objectContaining({
        id,
      }),
    );
  });
});
