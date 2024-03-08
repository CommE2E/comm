// @flow

import { reduceDbOpsStore } from './db-ops-reducer.js';
import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import type { DBOpsStore } from '../types/db-ops-types.js';

describe('DB ops reducer', () => {
  const store: DBOpsStore = {
    queuedOps: [
      { actionID: 1, ops: {} },
      { actionID: 4, ops: {} },
      { actionID: 5, ops: {} },
    ],
    noOpsActions: [3, 6, 8],
  };

  it('should filter ops', () => {
    const newState = reduceDbOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: [1, 5] },
    });
    expect(newState.queuedOps.length).toEqual(1);
    expect(newState.queuedOps[0].actionID).toEqual(4);
  });

  it('should filter actions without ops', () => {
    const newState = reduceDbOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: [3, 6] },
    });
    expect(newState.noOpsActions.length).toEqual(1);
    expect(newState.noOpsActions[0]).toEqual(8);
  });

  it('should filter both queues', () => {
    const newState = reduceDbOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: [1, 6] },
    });
    expect(newState.noOpsActions.length).toEqual(2);
    expect(newState.queuedOps.length).toEqual(2);
  });

  it("shouldn't filter ops when ids aren't present", () => {
    const newState = reduceDbOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: [10] },
    });
    expect(newState.noOpsActions.length).toEqual(3);
    expect(newState.queuedOps.length).toEqual(3);
  });

  it("shouldn't change queue order", () => {
    const newState = reduceDbOpsStore(store, {
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: [4] },
    });
    expect(newState.queuedOps.length).toEqual(2);
    expect(newState.queuedOps[0].actionID).toEqual(1);
    expect(newState.queuedOps[1].actionID).toEqual(5);
  });
});
