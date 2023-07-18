// @flow

import { getDatabaseModule } from './db-module.js';

describe('Database Module', () => {
  it('should construct a Database', async () => {
    const module = getDatabaseModule();
    const queryExecutor = new module.SQLiteQueryExecutor('test.sqlite');
    expect(queryExecutor).not.toBe(undefined);
  });
});
