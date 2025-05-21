// @flow

import {
  convertUserInfoToClientDBUserInfo,
  userStoreOpsHandlers,
} from 'lib/ops/user-store-ops.js';
import type { UserInfo } from 'lib/types/user-types.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import { type SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_USER_1: UserInfo = {
  id: '256',
  username: 'Test1',
  relationshipStatus: 2,
  avatar: {
    type: 'image',
    uri: 'av1',
  },
};
const TEST_USER_2: UserInfo = {
  id: '512',
  username: 'Test2',
  relationshipStatus: 3,
  avatar: {
    type: 'image',
    uri: 'av2',
  },
};

describe('User Store queries', () => {
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
    queryExecutor?.replaceUser(convertUserInfoToClientDBUserInfo(TEST_USER_1));
    queryExecutor?.replaceUser(convertUserInfoToClientDBUserInfo(TEST_USER_2));
  });

  afterEach(() => {
    if (!dbModule || !queryExecutor) {
      return;
    }
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all users', () => {
    const users = queryExecutor?.getAllUsers();
    expect(users?.length).toBe(2);
  });

  it('should remove all users', () => {
    queryExecutor?.removeAllUsers();
    const users = queryExecutor?.getAllUsers();
    expect(users?.length).toBe(0);
  });

  it('should update user avatar', () => {
    const user2Updated: UserInfo = {
      id: '512',
      username: 'Test2',
      avatar: {
        type: 'image',
        uri: 'new_av',
      },
    };

    queryExecutor?.replaceUser(convertUserInfoToClientDBUserInfo(user2Updated));

    const dbUsers = queryExecutor?.getAllUsers();
    if (!dbUsers) {
      throw new Error('users not defined');
    }
    expect(dbUsers.length).toBe(2);

    const users = userStoreOpsHandlers.translateClientDBData(dbUsers);
    expect(users['512']).toBeDefined();
    expect(users['512'].avatar?.uri).toBe(user2Updated.avatar?.uri);
    expect(users['512'].relationshipStatus).not.toBeDefined();
  });

  it('should remove user', () => {
    queryExecutor?.removeUsers(['512']);

    const dbUsers = queryExecutor?.getAllUsers();
    if (!dbUsers) {
      throw new Error('users not defined');
    }
    expect(dbUsers.length).toBe(1);

    const users = userStoreOpsHandlers.translateClientDBData(dbUsers);
    expect(users['256']).toBeDefined();
  });
});
