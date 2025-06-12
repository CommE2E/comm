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
    // Add regular message store local infos
    queryExecutor.replaceMessageStoreLocalMessageInfo(
      {
        id: '1',
        localMessageInfo: JSON.stringify({}),
      },
      false,
    );
    queryExecutor.replaceMessageStoreLocalMessageInfo(
      {
        id: '2',
        localMessageInfo: JSON.stringify({ sendFailed: '1' }),
      },
      false,
    );
    queryExecutor.replaceMessageStoreLocalMessageInfo(
      {
        id: '3',
        localMessageInfo: JSON.stringify({ sendFailed: '0' }),
      },
      false,
    );
    queryExecutor.replaceMessageStoreLocalMessageInfo(
      {
        id: '4',
        localMessageInfo: JSON.stringify({ sendFailed: '1' }),
      },
      false,
    );
    // Add backup message store local infos
    queryExecutor.replaceMessageStoreLocalMessageInfo(
      {
        id: 'backup1',
        localMessageInfo: JSON.stringify({
          sendFailed: '0',
          customProp: 'backup1',
        }),
      },
      true,
    );
    queryExecutor.replaceMessageStoreLocalMessageInfo(
      {
        id: 'backup2',
        localMessageInfo: JSON.stringify({
          sendFailed: '1',
          customProp: 'backup2',
        }),
      },
      true,
    );
  });

  afterEach(() => {
    clearSensitiveData(dbModule, FILE_PATH, queryExecutor);
  });

  it('should return all message store local message infos from both regular and backup tables', () => {
    const local = queryExecutor.getAllMessageStoreLocalMessageInfos();
    expect(local.length).toBe(6); // 4 regular + 2 backup

    // Check regular infos exist
    const regularInfos = local.filter(l => ['1', '2', '3', '4'].includes(l.id));
    expect(regularInfos.length).toBe(4);

    // Check backup infos exist
    const backupInfos = local.filter(l =>
      ['backup1', 'backup2'].includes(l.id),
    );
    expect(backupInfos.length).toBe(2);

    const backup1 = backupInfos.find(l => l.id === 'backup1');
    const backup1Data = JSON.parse(backup1?.localMessageInfo || '{}');
    expect(backup1Data.customProp).toBe('backup1');
  });

  it('should remove all message store local message infos from both tables', () => {
    queryExecutor.removeAllMessageStoreLocalMessageInfos();
    const local = queryExecutor.getAllMessageStoreLocalMessageInfos();
    expect(local.length).toBe(0);
  });

  it('should remove subset of message store local message infos from both tables', () => {
    queryExecutor.removeMessageStoreLocalMessageInfos(['2', 'backup1']);
    const local = queryExecutor.getAllMessageStoreLocalMessageInfos();
    expect(local.length).toBe(4); // 6 - 2 = 4

    // Verify correct infos removed
    const remainingIds = local.map(l => l.id);
    expect(remainingIds).toContain('1');
    expect(remainingIds).toContain('3');
    expect(remainingIds).toContain('4');
    expect(remainingIds).toContain('backup2');
    expect(remainingIds).not.toContain('2');
    expect(remainingIds).not.toContain('backup1');
  });

  it('should target correct table when replacing based on backupItem parameter', () => {
    // Add new info to regular table
    queryExecutor.replaceMessageStoreLocalMessageInfo(
      {
        id: 'new_regular',
        localMessageInfo: JSON.stringify({ sendFailed: '0', type: 'regular' }),
      },
      false,
    );

    // Add new info to backup table
    queryExecutor.replaceMessageStoreLocalMessageInfo(
      {
        id: 'new_backup',
        localMessageInfo: JSON.stringify({ sendFailed: '1', type: 'backup' }),
      },
      true,
    );

    const local = queryExecutor.getAllMessageStoreLocalMessageInfos();
    expect(local.length).toBe(8); // 6 + 2 = 8

    const newRegular = local.find(l => l.id === 'new_regular');
    const newBackup = local.find(l => l.id === 'new_backup');

    const regularData = JSON.parse(newRegular?.localMessageInfo || '{}');
    const backupData = JSON.parse(newBackup?.localMessageInfo || '{}');

    expect(regularData.type).toBe('regular');
    expect(backupData.type).toBe('backup');
  });
});
