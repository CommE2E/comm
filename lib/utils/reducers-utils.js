// @flow

import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState } from '../types/redux-types.js';

function sanitizeStateOnIdentityActions<N: BaseNavInfo, T: BaseAppState<N>>(
  state: T,
  defaultState: T,
  fieldsToExcludeFromSanitization: $ReadOnlyArray<string>,
): T {
  const fieldsToExcludeFromSanitizationSet = new Set<string>(
    fieldsToExcludeFromSanitization,
  );

  return Object.keys(state).reduce(
    (newState, key: string) => {
      if (fieldsToExcludeFromSanitizationSet.has(key)) {
        return { ...newState, [key]: state[key] };
      }
      return newState;
    },
    { ...defaultState },
  );
}

export { sanitizeStateOnIdentityActions };
