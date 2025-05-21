// @flow

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Message store local queries', () => {
  let queryExecutor;
  let dbModule;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH, false);
    if (!queryExecutor) {
      throw new Error('SQLiteQueryExecutor is missing');
    }
    queryExecutor.replaceMessageStoreLocalMessageInfo({
      id: '1',
      localMessageInfo: JSON.stringify({}),
    });
    queryExecutor.replaceMessageStoreLocalMessageInfo({
      id: '2',
      localMessageInfo: JSON.stringify({ sendFailed: '1' }),
    });
    queryExecutor.replaceMessageStoreLocalMessageInfo({
      id: '3',
      localMessageInfo: JSON.stringify({ sendFailed: '0' }),
    });
    queryExecutor.replaceMessageStoreLocalMessageInfo({
      id: '4',
      localMessageInfo: JSON.stringify({ sendFailed: '1' }),
    });
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all message store local message infos', () => {
    const local = queryExecutor.getAllMessageStoreLocalMessageInfos();
    expect(local.length).toBe(4);
  });

  it('should remove all message store local message infos', () => {
    queryExecutor.removeAllMessageStoreLocalMessageInfos();
    const local = queryExecutor.getAllMessageStoreLocalMessageInfos();
    expect(local.length).toBe(0);
  });

  it('should remove a subset of message store local message infos', () => {
    queryExecutor.removeMessageStoreLocalMessageInfos(['2', '3']);
    const local = queryExecutor.getAllMessageStoreLocalMessageInfos();
    expect(local.length).toBe(2);
  });
});
