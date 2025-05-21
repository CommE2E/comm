// @flow

import {
  convertKeyserverInfoToClientDBKeyserverInfo,
  keyserverStoreOpsHandlers,
} from 'lib/ops/keyserver-store-ops.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_KEYSERVER_1: KeyserverInfo = {
  cookie: 'testCookie1',
  updatesCurrentAsOf: 0,
  urlPrefix: 'localhost',
  connection: {
    ...defaultConnectionInfo,
  },
  deviceToken: 'token',
  lastCommunicatedPlatformDetails: null,
  actualizedCalendarQuery: {
    startDate: '',
    endDate: '',
    filters: defaultCalendarFilters,
  },
};
const TEST_KEYSERVER_2: KeyserverInfo = {
  cookie: 'testCookie2',
  updatesCurrentAsOf: 0,
  urlPrefix: 'localhost',
  connection: {
    ...defaultConnectionInfo,
  },
  deviceToken: 'token',
  lastCommunicatedPlatformDetails: null,
  actualizedCalendarQuery: {
    startDate: '',
    endDate: '',
    filters: defaultCalendarFilters,
  },
};

describe('Keyserver Store queries', () => {
  let queryExecutor: ?SQLiteQueryExecutor = null;
  let dbModule: ?EmscriptenModule = null;

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
    queryExecutor?.replaceKeyserver(
      convertKeyserverInfoToClientDBKeyserverInfo({
        keyserverInfo: TEST_KEYSERVER_1,
        id: '1',
      }),
    );
    queryExecutor?.replaceKeyserver(
      convertKeyserverInfoToClientDBKeyserverInfo({
        keyserverInfo: TEST_KEYSERVER_2,
        id: '2',
      }),
    );
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all keyservers', () => {
    const keyservers = queryExecutor?.getAllKeyservers();
    expect(keyservers?.length).toBe(2);
  });

  it('should remove all keyservers', () => {
    queryExecutor?.removeAllKeyservers();
    const keyservers = queryExecutor?.getAllKeyservers();
    expect(keyservers?.length).toBe(0);
  });

  it('should update keyserver cookie', () => {
    const keyserver2Updated: KeyserverInfo = {
      ...TEST_KEYSERVER_1,
      cookie: 'updatedCookie',
    };

    queryExecutor?.replaceKeyserver(
      convertKeyserverInfoToClientDBKeyserverInfo({
        keyserverInfo: keyserver2Updated,
        id: '1',
      }),
    );

    const keyservers = queryExecutor?.getAllKeyservers();
    if (!keyservers) {
      throw new Error('keyservers not defined');
    }
    expect(keyservers.length).toBe(2);

    const keyserversFromDB =
      keyserverStoreOpsHandlers.translateClientDBData(keyservers);
    expect(keyserversFromDB['1']).toBeDefined();
    expect(keyserversFromDB['1'].cookie).toBe('updatedCookie');
  });

  it('should remove keyserver', () => {
    queryExecutor?.removeKeyservers(['1']);

    const keyservers = queryExecutor?.getAllKeyservers();
    if (!keyservers) {
      throw new Error('keyservers not defined');
    }
    expect(keyservers.length).toBe(1);

    const keyserversFromDB =
      keyserverStoreOpsHandlers.translateClientDBData(keyservers);
    expect(keyserversFromDB['2']).toBeDefined();
  });
});
