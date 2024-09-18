// @flow

import { reduceHolderStore } from './holder-reducer.js';
import { storeEstablishedHolderActionType } from '../actions/holder-actions.js';
import { type HolderStore } from '../types/holder-types.js';
import type { BaseAction } from '../types/redux-types.js';

describe('reduceHolderStore', () => {
  it('STORE_ESTABLISHED_HOLDER', () => {
    const store: HolderStore = {
      storedHolders: {},
    };

    const action: BaseAction = {
      type: storeEstablishedHolderActionType,
      payload: { blobHash: 'foo', holder: 'bar' },
    };

    expect(reduceHolderStore(store, action).storedHolders).toStrictEqual({
      foo: { holder: 'bar', status: 'ESTABLISHED' },
    });
  });
});
