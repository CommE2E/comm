// @flow

import { getAllReports } from './report-queries.js';
import Module from '../_generated/CommQueryCreator.js';

describe('Report Store queries', () => {
  let instance;
  let vec;

  beforeAll(async () => {
    const module = Module();
    instance = new module.CommQueryCreator('test.sqlite');
    vec = new module.StringVector();
  });

  beforeEach(() => {
    instance.replaceReport({ id: '1', report: '{report_content_1' });
    instance.replaceReport({ id: '2', report: '{report_content_2}' });
  });

  afterEach(() => {
    instance.removeAllReports();
  });

  //FIXME this should be done differently
  // it('should create table', () => {
  //   const res = db.exec(`PRAGMA table_info(reports);`);
  //   const [parsedRes] = parseMultiStatementSQLiteResult(res);
  //
  //   expect(parsedRes).toHaveLength(2);
  //   expect(parsedRes).toEqual(
  //     expect.arrayContaining([
  //       expect.objectContaining({
  //         name: 'id',
  //         type: 'TEXT',
  //       }),
  //       expect.objectContaining({
  //         name: 'report',
  //         type: 'TEXT',
  //       }),
  //     ]),
  //   );
  // });

  it('should return all reports', () => {
    const reports = getAllReports(instance);
    expect(reports).toHaveLength(2);
  });

  it('should remove all reports', () => {
    instance.removeAllReports();
    const reports = getAllReports(instance);
    expect(reports).toHaveLength(0);
  });

  it('should insert not existing report', () => {
    const id = '3';
    const report = '{some_content}';
    instance.replaceReport({ id, report });

    const reports = getAllReports(instance);
    expect(reports).toHaveLength(3);
    expect(reports).toContainEqual({ id, report });
  });

  it('should reports with given id', () => {
    vec.push_back('2');
    instance.removeReports(vec);

    const reports = getAllReports(instance);
    expect(reports).toHaveLength(1);
    expect(reports).not.toContain(
      expect.objectContaining({
        id: '2',
      }),
    );
  });
});
