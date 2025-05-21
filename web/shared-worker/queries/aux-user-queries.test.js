// @flow

import { auxUserStoreOpsHandlers } from 'lib/ops/aux-user-store-ops.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

describe('Aux User Store queries', () => {
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
    queryExecutor?.replaceAuxUserInfo({
      id: 'test_id_1',
      auxUserInfo: JSON.stringify({ fid: 'test_aux_user_info_1' }),
    });
    queryExecutor?.replaceAuxUserInfo({
      id: 'test_id_2',
      auxUserInfo: JSON.stringify({ fid: 'test_aux_user_info_2' }),
    });
    queryExecutor?.replaceAuxUserInfo({
      id: 'test_id_3',
      auxUserInfo: JSON.stringify({ fid: 'test_aux_user_info_3' }),
    });
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }

    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all aux user infos', () => {
    const auxUserInfos = queryExecutor?.getAllAuxUserInfos();

    expect(auxUserInfos).toHaveLength(3);
  });

  it('should remove all aux user infos', () => {
    queryExecutor?.removeAllAuxUserInfos();
    const auxUserInfos = queryExecutor?.getAllAuxUserInfos();

    expect(auxUserInfos).toHaveLength(0);
  });

  it('should update aux user info test_id_2', () => {
    queryExecutor?.replaceAuxUserInfo({
      id: 'test_id_2',
      auxUserInfo: JSON.stringify({ fid: 'update_aux_user_info_2' }),
    });

    const auxUserInfos = queryExecutor?.getAllAuxUserInfos();
    if (!auxUserInfos) {
      throw new Error('aux user infos not defined');
    }

    expect(auxUserInfos).toHaveLength(3);

    const auxUserInfosFromDB =
      auxUserStoreOpsHandlers.translateClientDBData(auxUserInfos);

    expect(auxUserInfosFromDB['test_id_2']).toBeDefined();
    expect(auxUserInfosFromDB['test_id_2'].fid).toBe('update_aux_user_info_2');
  });

  it('should remove aux user infos test_id_1 and test_id_3', () => {
    queryExecutor?.removeAuxUserInfos(['test_id_1', 'test_id_3']);

    const auxUserInfos = queryExecutor?.getAllAuxUserInfos();
    if (!auxUserInfos) {
      throw new Error('aux user infos not defined');
    }

    expect(auxUserInfos.length).toBe(1);

    const auxUserInfosFromDB =
      auxUserStoreOpsHandlers.translateClientDBData(auxUserInfos);

    expect(auxUserInfosFromDB['test_id_2']).toBeDefined();
  });
});
