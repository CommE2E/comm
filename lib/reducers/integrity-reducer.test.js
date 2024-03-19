// @flow

import { reduceIntegrityStore } from './integrity-reducer.js';
import { updateIntegrityStoreActionType } from '../actions/integrity-actions.js';
import type { ThreadStoreOperation } from '../ops/thread-store-ops';
import { type ThreadHashes } from '../types/integrity-types.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { hash } from '../utils/objects.js';

jest.mock('../utils/config.js');

const CURRENT_THREAD_HASHES: ThreadHashes = {
  '256|2204191': 1029852,
  '256|2205980': 3119392,
  '256|2208693': 4157082,
  '256|2212631': 8951764,
};

const THREAD_IDS_REMOVE = ['256|2204191', '256|2205980'];

const THREAD_HASHES_AFTER_REMOVAL: ThreadHashes = {
  '256|2208693': 4157082,
  '256|2212631': 8951764,
};

const UPDATED_THREAD_ID = '256|2210486';
const THREAD_HASH_UPDATE_IDS = [UPDATED_THREAD_ID];

type ThreadInfos = {
  +[string]: RawThreadInfo,
};

const threadInfos: ThreadInfos = {
  [UPDATED_THREAD_ID]: {
    currentUser: {
      role: '256|83795',
      permissions: '3',
      minimallyEncoded: true,
      unread: true,
      subscription: {
        pushNotifs: true,
        home: true,
      },
    },
    id: UPDATED_THREAD_ID,
    type: 12,
    name: 'GENESIS',
    description: '',
    color: '648caa',
    creationTime: 1689091732528,
    parentThreadID: null,
    repliesCount: 0,
    containingThreadID: null,
    community: null,
    pinnedCount: 0,
    minimallyEncoded: true,
    members: [
      {
        id: '256',
        role: '256|83796',
        permissions: '3f73ff',
        isSender: true,
        minimallyEncoded: true,
      },
      {
        id: '83810',
        role: '256|83795',
        permissions: '3',
        isSender: false,
        minimallyEncoded: true,
      },
    ],
    roles: {
      '256|83795': {
        id: '256|83795',
        name: 'Members',
        permissions: ['000', '010', '005', '015', '0a7'],
        isDefault: true,
        minimallyEncoded: true,
      },
      '256|83796': {
        id: '256|83796',
        name: 'Admins',
        permissions: ['000', '010', '005', '015', '0a7'],
        isDefault: false,
        minimallyEncoded: true,
      },
    },
  },
};

const TEST_THREAD_HASH = hash(threadInfos[UPDATED_THREAD_ID]);

describe('reduceIntegrityStore', () => {
  it('update integrity store with new thread hash', () => {
    const oldIntegrityStore = {
      threadHashes: CURRENT_THREAD_HASHES,
      threadHashingStatus: 'completed',
    };

    const updateThreadHashesAction = {
      type: updateIntegrityStoreActionType,
      payload: { threadIDsToHash: THREAD_HASH_UPDATE_IDS },
    };

    expect(
      reduceIntegrityStore(
        oldIntegrityStore,
        updateThreadHashesAction,
        () => null,
        threadInfos,
        [],
      ).integrityStore,
    ).toEqual({
      threadHashes: {
        ...CURRENT_THREAD_HASHES,
        [UPDATED_THREAD_ID]: TEST_THREAD_HASH,
      },
      threadHashingStatus: 'completed',
    });
  });

  it('process replace threadStoreOperations', () => {
    const oldIntegrityStore = {
      threadHashes: CURRENT_THREAD_HASHES,
      threadHashingStatus: 'completed',
    };

    const updateThreadHashesAction = {
      type: updateIntegrityStoreActionType,
      payload: { threadHashingStatus: 'completed' },
    };

    const threadStoreOperations: Array<ThreadStoreOperation> = [
      {
        type: 'replace',
        payload: {
          id: UPDATED_THREAD_ID,
          threadInfo: threadInfos[UPDATED_THREAD_ID],
        },
      },
    ];

    expect(
      reduceIntegrityStore(
        oldIntegrityStore,
        updateThreadHashesAction,
        () => null,
        threadInfos,
        threadStoreOperations,
      ).integrityStore,
    ).toEqual({
      threadHashes: {
        ...CURRENT_THREAD_HASHES,
        [UPDATED_THREAD_ID]: TEST_THREAD_HASH,
      },
      threadHashingStatus: 'completed',
    });
  });

  it('process remove threadStoreOperations', () => {
    const oldIntegrityStore = {
      threadHashes: CURRENT_THREAD_HASHES,
      threadHashingStatus: 'completed',
    };

    const updateThreadHashesAction = {
      type: updateIntegrityStoreActionType,
      payload: { threadHashingStatus: 'completed' },
    };

    const threadStoreOperations: Array<ThreadStoreOperation> = [
      {
        type: 'remove',
        payload: {
          ids: THREAD_IDS_REMOVE,
        },
      },
    ];

    expect(
      reduceIntegrityStore(
        oldIntegrityStore,
        updateThreadHashesAction,
        () => null,
        threadInfos,
        threadStoreOperations,
      ).integrityStore,
    ).toEqual({
      threadHashes: THREAD_HASHES_AFTER_REMOVAL,
      threadHashingStatus: 'completed',
    });
  });

  it('process removal all and replace threadStoreOperations', () => {
    const oldIntegrityStore = {
      threadHashes: CURRENT_THREAD_HASHES,
      threadHashingStatus: 'completed',
    };

    const updateThreadHashesAction = {
      type: updateIntegrityStoreActionType,
      payload: { threadHashingStatus: 'completed' },
    };

    const threadStoreOperations: Array<ThreadStoreOperation> = [
      {
        type: 'remove_all',
      },
      {
        type: 'replace',
        payload: {
          id: UPDATED_THREAD_ID,
          threadInfo: threadInfos[UPDATED_THREAD_ID],
        },
      },
    ];

    expect(
      reduceIntegrityStore(
        oldIntegrityStore,
        updateThreadHashesAction,
        () => null,
        threadInfos,
        threadStoreOperations,
      ).integrityStore,
    ).toEqual({
      threadHashes: { [UPDATED_THREAD_ID]: TEST_THREAD_HASH },
      threadHashingStatus: 'completed',
    });
  });
});
