// @flow

import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState } from '../types/redux-types.js';

function resetUserSpecificStateOnIdentityActions<
  N: BaseNavInfo,
  T: BaseAppState<N>,
>(
  state: T,
  defaultState: T,
  nonUserSpecificFields: $ReadOnlyArray<$Keys<T>>,
): T {
  let newState: T = { ...defaultState };
  for (const field of nonUserSpecificFields) {
    newState = {
      ...newState,
      [(field: string)]: state[field],
    };
  }
  return newState;
}

export { resetUserSpecificStateOnIdentityActions };
