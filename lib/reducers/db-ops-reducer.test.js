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
};

describe('DB ops reducer', () => {
  const store: DBOpsStore = {
    queuedOps: [
      { opsID: '1', ops: emptyOps, actionID: '5' },
      { opsID: '4', ops: emptyOps, actionID: '6' },
      { opsID: '5', ops: emptyOps, actionID: '7' },
    ],
    noOpsActions: ['3', '6', '8'],
  };

  it('should filter ops', () => {
    const newState = reduceDBOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: [], opsID: '4' },
    });
    expect(newState.queuedOps.length).toEqual(2);
    expect(newState.queuedOps[0].opsID).toEqual('1');
    expect(newState.queuedOps[1].opsID).toEqual('5');
  });

  it('should filter actions without ops', () => {
    const newState = reduceDBOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: ['3', '6'] },
    });
    expect(newState.noOpsActions.length).toEqual(1);
    expect(newState.noOpsActions[0]).toEqual('8');
  });

  it('should filter both queues', () => {
    const newState = reduceDBOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: ['6'], opsID: '1' },
    });
    expect(newState.noOpsActions.length).toEqual(2);
    expect(newState.queuedOps.length).toEqual(2);
  });

  it("shouldn't filter ops when ids aren't present", () => {
    const newState = reduceDBOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: ['10'] },
    });
    expect(newState.noOpsActions.length).toEqual(3);
    expect(newState.queuedOps.length).toEqual(3);
  });

  it("shouldn't change queue order", () => {
    const newState = reduceDBOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { opsID: '4', actionIDs: [] },
    });
    expect(newState.queuedOps.length).toEqual(2);
    expect(newState.queuedOps[0].actionID).toEqual('5');
    expect(newState.queuedOps[1].actionID).toEqual('7');
  });
});
