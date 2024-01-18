// @flow

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Draft Store queries', () => {
  let queryExecutor;
  let dbModule;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    queryExecutor.storeOlmPersistDataWeb('accountData', [
      { target_user_id: '1', session_data: '1' },
      { target_user_id: '2', session_data: '2' },
      { target_user_id: '3', session_data: '3' },
    ]);
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return olm account data', () => {
    const olmAccount = queryExecutor.getOlmPersistAccountDataWeb();
    expect(olmAccount.isNull).toBe(false);
  });

  it('should return all olm sessions', () => {
    const olmSessions = queryExecutor.getOlmPersistSessionsData();
    expect(olmSessions.length).toBe(3);
  });
});
