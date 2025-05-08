// @flow

import { getDatabaseModule } from '../db-module.js';
import type { OlmPersistSession } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_SESSION_DATA: OlmPersistSession[] = [
  {
    targetDeviceID: '1',
    sessionData: '1',
    version: 1,
  },
  {
    targetDeviceID: '2',
    sessionData: '2',
    version: 2,
  },
  {
    targetDeviceID: '3',
    sessionData: '3',
    version: 2,
  },
];

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

    queryExecutor.storeOlmPersistSession(TEST_SESSION_DATA[0]);
    queryExecutor.storeOlmPersistSession(TEST_SESSION_DATA[1]);
    queryExecutor.storeOlmPersistSession(TEST_SESSION_DATA[2]);
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return olm account data', () => {
    const contentOlmAccount = queryExecutor.getOlmPersistAccountData(
      queryExecutor.getContentAccountID(),
    );
    expect(contentOlmAccount).toBe('contentAccountData');

    const notifsOlmAccount = queryExecutor.getOlmPersistAccountData(
      queryExecutor.getNotifsAccountID(),
    );
    expect(notifsOlmAccount).toBe('notifsAccountData');
  });

  it('should return all olm sessions', () => {
    const olmSessions = queryExecutor.getOlmPersistSessionsData();
    expect(olmSessions.length).toBe(3);
    expect(olmSessions).toStrictEqual(TEST_SESSION_DATA);
  });

  it('should return empty olm account data', () => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);

    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);

    const notifsOlmAccount = queryExecutor.getOlmPersistAccountData(
      queryExecutor.getNotifsAccountID(),
    );
    expect(notifsOlmAccount).toBe(null);
  });
});
