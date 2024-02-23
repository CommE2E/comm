// @flow

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Olm Tables queries', () => {
  let queryExecutor;
  let dbModule;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    queryExecutor.storeOlmPersistAccount(true, 'contentAccountData');
    queryExecutor.storeOlmPersistAccount(false, 'notifsAccountData');

    queryExecutor.storeOlmPersistSession({
      targetUserID: '1',
      sessionData: '1',
    });
    queryExecutor.storeOlmPersistSession({
      targetUserID: '2',
      sessionData: '2',
    });
    queryExecutor.storeOlmPersistSession({
      targetUserID: '3',
      sessionData: '3',
    });
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return olm account data', () => {
    const contentOlmAccount = queryExecutor.getOlmPersistAccountDataWeb(true);
    expect(contentOlmAccount.value).toBe('contentAccountData');

    const notifsOlmAccount = queryExecutor.getOlmPersistAccountDataWeb(false);
    expect(notifsOlmAccount.value).toBe('notifsAccountData');
  });

  it('should return all olm sessions', () => {
    const olmSessions = queryExecutor.getOlmPersistSessionsData();
    expect(olmSessions.length).toBe(3);
  });
});
