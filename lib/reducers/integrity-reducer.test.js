// @flow

import { reduceIntegrityStore } from './integrity-reducer.js';
import { updateIntegrityStoreActionType } from '../actions/integrity-actions.js';
import { createReplaceThreadOperation } from '../ops/create-replace-thread-operation.js';
import type { ThreadStoreOperation } from '../ops/thread-store-ops';
import { type ThreadHashes } from '../types/integrity-types.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { hash } from '../utils/objects.js';

jest.mock('../utils/config.js');

const currentThreadHashes: ThreadHashes = {
  '256|2204191': 1029852,
  '256|2205980': 3119392,
  '256|2208693': 4157082,
  '256|2212631': 8951764,
};

const threadIDToUpdate = '256|2210486';
const threadIDsToUpdateList = [threadIDToUpdate];

type ThreadInfos = {
  +[string]: RawThreadInfo,
};

const threadInfos: ThreadInfos = {
  [threadIDToUpdate]: {
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
    id: threadIDToUpdate,
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
        isSender: true,
        minimallyEncoded: true,
      },
      {
        id: '83810',
        role: '256|83795',
        isSender: false,
        minimallyEncoded: true,
      },
    ],
    roles: {
      '256|83795': {
        id: '256|83795',
        name: 'Members',
        permissions: ['000', '010', '005', '015', '0a7'],
        minimallyEncoded: true,
      },
      '256|83796': {
        id: '256|83796',
        name: 'Admins',
        permissions: ['000', '010', '005', '015', '0a7'],
        minimallyEncoded: true,
      },
    },
  },
};

const threadHashToUpdate = hash(threadInfos[threadIDToUpdate]);

describe('reduceIntegrityStore', () => {
  it('should update integrity store with new thread hash', () => {
    const oldIntegrityStore = {
      threadHashes: currentThreadHashes,
      threadHashingStatus: 'completed',
    };

    const updateThreadHashesAction = {
      type: updateIntegrityStoreActionType,
      payload: { threadIDsToHash: threadIDsToUpdateList },
    };

    expect(
      reduceIntegrityStore(
        oldIntegrityStore,
        updateThreadHashesAction,
        threadInfos,
        [],
      ).integrityStore,
    ).toEqual({
      threadHashes: {
        ...currentThreadHashes,
        [threadIDToUpdate]: threadHashToUpdate,
      },
      threadHashingStatus: 'completed',
    });
  });

  it('should update integrity store with new thread hash', () => {
    const oldIntegrityStore = {
      threadHashes: currentThreadHashes,
      threadHashingStatus: 'completed',
    };

    const updateThreadHashesAction = {
      type: updateIntegrityStoreActionType,
      payload: { threadHashingStatus: 'completed' },
    };

    const threadStoreOperations: Array<ThreadStoreOperation> = [
      createReplaceThreadOperation(
        threadIDToUpdate,
        threadInfos[threadIDToUpdate],
      ),
    ];

    expect(
      reduceIntegrityStore(
        oldIntegrityStore,
        updateThreadHashesAction,
        threadInfos,
        threadStoreOperations,
      ).integrityStore,
    ).toEqual({
      threadHashes: {
        ...currentThreadHashes,
        [threadIDToUpdate]: threadHashToUpdate,
      },
      threadHashingStatus: 'completed',
    });
  });

  it('should remove two thread hashes', () => {
    const oldIntegrityStore = {
      threadHashes: currentThreadHashes,
      threadHashingStatus: 'completed',
    };

    const thread_ids_remove = ['256|2204191', '256|2205980'];

    const thread_hashes_after_removal: ThreadHashes = {
      '256|2208693': 4157082,
      '256|2212631': 8951764,
    };

    const updateThreadHashesAction = {
      type: updateIntegrityStoreActionType,
      payload: { threadHashingStatus: 'completed' },
    };

    const threadStoreOperations: Array<ThreadStoreOperation> = [
      {
        type: 'remove',
        payload: {
          ids: thread_ids_remove,
        },
      },
    ];

    expect(
      reduceIntegrityStore(
        oldIntegrityStore,
        updateThreadHashesAction,
        threadInfos,
        threadStoreOperations,
      ).integrityStore,
    ).toEqual({
      threadHashes: thread_hashes_after_removal,
      threadHashingStatus: 'completed',
    });
  });

  it('should clear thread hashes and update with a single thread hash', () => {
    const oldIntegrityStore = {
      threadHashes: currentThreadHashes,
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
      createReplaceThreadOperation(
        threadIDToUpdate,
        threadInfos[threadIDToUpdate],
      ),
    ];

    expect(
      reduceIntegrityStore(
        oldIntegrityStore,
        updateThreadHashesAction,
        threadInfos,
        threadStoreOperations,
      ).integrityStore,
    ).toEqual({
      threadHashes: { [threadIDToUpdate]: threadHashToUpdate },
      threadHashingStatus: 'completed',
    });
  });
});
