// @flow

import {
  convertCommunityInfoToClientDBCommunityInfo,
  communityStoreOpsHandlers,
} from 'lib/ops/community-store-ops.js';
import type { CommunityInfo } from 'lib/types/community-types.js';

import { getDatabaseModule } from '../db-module.js';
import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const FILE_PATH = 'test.sqlite';

const TEST_COMMUNITY_1: CommunityInfo = {
  enabledApps: {
    calendar: false,
    wiki: false,
    tasks: true,
    files: true,
  },
};

const TEST_COMMUNITY_2: CommunityInfo = {
  enabledApps: {
    calendar: true,
    wiki: false,
    tasks: false,
    files: false,
  },
};

describe('Community Store queries', () => {
  let queryExecutor: ?SQLiteQueryExecutor = null;
  let dbModule: ?EmscriptenModule = null;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    queryExecutor = new dbModule.SQLiteQueryExecutor(FILE_PATH);
    if (!queryExecutor) {
      throw new Error('SQLite Query Executor is missing');
    }
    queryExecutor?.replaceCommunity(
      convertCommunityInfoToClientDBCommunityInfo({
        communityInfo: TEST_COMMUNITY_1,
        id: '1',
      }),
    );
    queryExecutor?.replaceCommunity(
      convertCommunityInfoToClientDBCommunityInfo({
        communityInfo: TEST_COMMUNITY_2,
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

  it('should return all communities', () => {
    const communities = queryExecutor?.getAllCommunities();

    expect(communities).toHaveLength(2);
  });

  it('should remove all communities', () => {
    queryExecutor?.removeAllCommunities();
    const communities = queryExecutor?.getAllCommunities();

    expect(communities).toHaveLength(0);
  });

  it('should update community enabled apps', () => {
    const community2Updated: CommunityInfo = {
      enabledApps: {
        calendar: true,
        wiki: true,
        tasks: true,
        files: true,
      },
    };

    queryExecutor?.replaceCommunity(
      convertCommunityInfoToClientDBCommunityInfo({
        communityInfo: community2Updated,
        id: '2',
      }),
    );

    const communities = queryExecutor?.getAllCommunities();
    if (!communities) {
      throw new Error('communities not defined');
    }

    expect(communities).toHaveLength(2);

    const communitiesFromDB =
      communityStoreOpsHandlers.translateClientDBData(communities);

    expect(communitiesFromDB['2']).toBeDefined();
    expect(communitiesFromDB['2'].enabledApps.calendar).toBe(true);
    expect(communitiesFromDB['2'].enabledApps.wiki).toBe(true);
    expect(communitiesFromDB['2'].enabledApps.tasks).toBe(true);
    expect(communitiesFromDB['2'].enabledApps.files).toBe(true);
  });

  it('should remove community', () => {
    queryExecutor?.removeCommunities(['2']);

    const communities = queryExecutor?.getAllCommunities();
    if (!communities) {
      throw new Error('communities not defined');
    }

    expect(communities.length).toBe(1);

    const communitiesFromDB =
      communityStoreOpsHandlers.translateClientDBData(communities);

    expect(communitiesFromDB['1']).toBeDefined();
  });
});
