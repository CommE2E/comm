// @flow

import { reduceDBOpsStore } from './db-ops-reducer.js';
import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import type { DBOpsStore } from '../types/db-ops-types.js';

const emptyOps = {
  draftStoreOperations: [],
  threadStoreOperations: [],
  messageStoreOperations: [],
  reportStoreOperations: [],
  userStoreOperations: [],
  keyserverStoreOperations: [],
  communityStoreOperations: [],
  integrityStoreOperations: [],
  syncedMetadataStoreOperations: [],
  auxUserStoreOperations: [],
  threadActivityStoreOperations: [],
};

describe('DB ops reducer', () => {
  const store: DBOpsStore = {
    queuedOps: [
      {
        ops: emptyOps,
        dispatchMetadata: { messageID: '5', senderDeviceID: '' },
      },
      { ops: emptyOps },
      {
        ops: null,
        dispatchMetadata: { messageID: '7', senderDeviceID: '' },
      },
    ],
  };

  it('should remove the first entry', () => {
    const newState = reduceDBOpsStore(store, {
      type: opsProcessingFinishedActionType,
    });
    expect(newState.queuedOps.length).toEqual(2);
    expect(newState.queuedOps[1].dispatchMetadata?.messageID).toEqual('7');
  });
});
