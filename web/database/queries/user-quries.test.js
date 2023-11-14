// @flow

import { getDatabaseModule } from '../db-module.js';
import type { ClientDBUserInfoWeb } from '../types/entiities.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_USER_1: ClientDBUserInfoWeb = {
  id: '256',
  username: { value: 'Test1', isNull: false },
  relationshipStatus: { value: '2', isNull: false },
  avatar: { value: 'av1.png', isNull: false },
};
const TEST_USER_2: ClientDBUserInfoWeb = {
  id: '512',
  username: { value: 'Test2', isNull: false },
  relationshipStatus: { value: '', isNull: true },
  avatar: { value: 'av2.png', isNull: false },
};

describe('User Store queries', () => {
  let queryExecutor;
  let dbModule;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    queryExecutor.replaceUserWeb(TEST_USER_1);
    queryExecutor.replaceUserWeb(TEST_USER_2);
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all users', () => {
    const users = queryExecutor.getAllUsersWeb();
    expect(users.length).toBe(2);
  });

  it('should remove all users', () => {
    queryExecutor.removeAllUsers();
    const users = queryExecutor.getAllUsersWeb();
    expect(users.length).toBe(0);
  });

  it('should update user avatar', () => {
    const user2Updated: ClientDBUserInfoWeb = {
      id: '512',
      username: { value: 'Test2', isNull: false },
      relationshipStatus: { value: '', isNull: true },
      avatar: { value: 'new_avatar.png', isNull: false },
    };

    queryExecutor.replaceUserWeb(user2Updated);

    const users = queryExecutor.getAllUsersWeb();
    expect(users.length).toBe(2);

    const user2 = users.find(u => u.id === '512');
    expect(user2).toBeDefined();
    expect(user2?.avatar.value).toBe(user2Updated.avatar.value);
    expect(user2?.avatar.isNull).toBe(user2Updated.avatar.isNull);
  });

  it('should remove user', () => {
    queryExecutor.removeUsers(['512']);

    const users = queryExecutor.getAllUsersWeb();
    expect(users.length).toBe(1);

    const user1 = users.find(u => u.id === '256');
    expect(user1).toBeDefined();
  });

  it('should read nullable value', () => {
    const users = queryExecutor.getAllUsersWeb();
    expect(users.length).toBe(2);

    const user = users.find(u => u.id === '512');
    expect(user).toBeDefined();
    expect(user?.relationshipStatus.value).toBe('');
    expect(user?.relationshipStatus.isNull).toBe(true);
  });
});
