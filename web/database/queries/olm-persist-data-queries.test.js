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
    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    if (!queryExecutor) {
      throw new Error('SQLiteQueryExecutor is missing');
    }
    queryExecutor.storeOlmPersistAccount(
      queryExecutor.getContentAccountID(),
      'contentAccountData',
    );
    queryExecutor.storeOlmPersistAccount(
      queryExecutor.getNotifsAccountID(),
      'notifsAccountData',
    );

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
    const contentOlmAccount = queryExecutor.getOlmPersistAccountDataWeb(
      queryExecutor.getContentAccountID(),
    );
    expect(contentOlmAccount.value).toBe('contentAccountData');

    const notifsOlmAccount = queryExecutor.getOlmPersistAccountDataWeb(
      queryExecutor.getNotifsAccountID(),
    );
    expect(notifsOlmAccount.value).toBe('notifsAccountData');
  });

  it('should return all olm sessions', () => {
    const olmSessions = queryExecutor.getOlmPersistSessionsData();
    expect(olmSessions.length).toBe(3);
  });
});
