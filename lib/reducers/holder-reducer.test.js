// @flow

import { reduceHolderStore } from './holder-reducer.js';
import {
  processHoldersActionTypes,
  storeEstablishedHolderActionType,
} from '../actions/holder-actions.js';
import { type HolderStore } from '../types/holder-types.js';
import type { BaseAction } from '../types/redux-types.js';

const mockLoadingInfo = {
  fetchIndex: 0,
  trackMultipleRequests: false,
  customKeyName: null,
};

describe('reduceHolderStore', () => {
  it('STORE_ESTABLISHED_HOLDER', () => {
    const store: HolderStore = {
      storedHolders: {},
    };

    const action: BaseAction = {
      type: storeEstablishedHolderActionType,
      payload: { blobHash: 'foo', holder: 'bar' },
    };

    expect(
      reduceHolderStore(store, action).holderStore.storedHolders,
    ).toStrictEqual({
      foo: { holder: 'bar', status: 'ESTABLISHED' },
    });
  });

  it('PROCESS_HOLDERS_STARTED', () => {
    const store: HolderStore = {
      storedHolders: {
        blob1: { holder: 'holder1', status: 'ESTABLISHED' },
      },
    };
    const action: BaseAction = {
      type: processHoldersActionTypes.started,
      payload: {
        holdersToRemove: [{ blobHash: 'blob1', holder: 'holder1' }],
        holdersToAdd: [{ blobHash: 'blob2', holder: 'holder2' }],
      },
      loadingInfo: mockLoadingInfo,
    };

    expect(
      reduceHolderStore(store, action).holderStore.storedHolders,
    ).toStrictEqual({
      blob1: { holder: 'holder1', status: 'PENDING_REMOVAL' },
      blob2: { holder: 'holder2', status: 'PENDING_ESTABLISHMENT' },
    });
  });

  it('PROCESS_HOLDERS_FAILED', () => {
    const store: HolderStore = {
      storedHolders: {
        blob1: { holder: 'holder1', status: 'ESTABLISHED' },
        blob2: { holder: 'holder2', status: 'PENDING_ESTABLISHMENT' },
        blob3: { holder: 'holder3', status: 'PENDING_REMOVAL' },
      },
    };

    const errorPayload: any = new Error('mock error');
    errorPayload.notAdded = [{ blobHash: 'blob2', holder: 'holder2' }];
    errorPayload.notRemoved = [{ blobHash: 'blob3', holder: 'holder3' }];

    const action: BaseAction = {
      type: processHoldersActionTypes.failed,
      error: true,
      payload: errorPayload,
      loadingInfo: mockLoadingInfo,
    };

    expect(
      reduceHolderStore(store, action).holderStore.storedHolders,
    ).toStrictEqual({
      blob1: { holder: 'holder1', status: 'ESTABLISHED' },
      blob2: { holder: 'holder2', status: 'NOT_ESTABLISHED' },
      blob3: { holder: 'holder3', status: 'NOT_REMOVED' },
    });
  });

  it('PROCESS_HOLDERS_SUCCESS', () => {
    const store: HolderStore = {
      storedHolders: {
        blob1: { holder: 'holder1', status: 'ESTABLISHED' },
        blob2: { holder: 'holder2', status: 'PENDING_ESTABLISHMENT' },
        blob3: { holder: 'holder3', status: 'PENDING_ESTABLISHMENT' },
        blob4: { holder: 'holder4', status: 'PENDING_REMOVAL' },
        blob5: { holder: 'holder5', status: 'PENDING_REMOVAL' },
      },
    };

    const action: BaseAction = {
      type: processHoldersActionTypes.success,
      payload: {
        added: [{ blobHash: 'blob2', holder: 'holder2' }],
        notAdded: [{ blobHash: 'blob3', holder: 'holder3' }],
        removed: [{ blobHash: 'blob4', holder: 'holder4' }],
        notRemoved: [{ blobHash: 'blob5', holder: 'holder5' }],
      },
      loadingInfo: mockLoadingInfo,
    };

    expect(
      reduceHolderStore(store, action).holderStore.storedHolders,
    ).toStrictEqual({
      blob1: { holder: 'holder1', status: 'ESTABLISHED' },
      blob2: { holder: 'holder2', status: 'ESTABLISHED' },
      blob3: { holder: 'holder3', status: 'NOT_ESTABLISHED' },
      // blob4 removed
      blob5: { holder: 'holder5', status: 'NOT_REMOVED' },
    });
  });
});
