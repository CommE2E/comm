// @flow

import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState } from '../types/redux-types.js';

function resetUserSpecificStateOnIdentityActions<
  N: BaseNavInfo,
  T: BaseAppState<N>,
>(state: T, defaultState: T, nonUserSpecificFields: $ReadOnlyArray<string>): T {
  const newState: T & { [string]: mixed } = { ...defaultState };
  for (const field of nonUserSpecificFields) {
    newState[field] = state[field];
  }
  return newState;
}

export { resetUserSpecificStateOnIdentityActions };
