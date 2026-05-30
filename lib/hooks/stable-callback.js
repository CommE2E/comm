// @flow

import * as React from 'react';
import {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE as ReactSharedInternals,
} from 'react';

type Callback = (...args: $ReadOnlyArray<empty>) => mixed;

// ReactSharedInternals.H points at Hooks dispatchers during function render.
const renderDispatchers: Set<mixed> = new Set();

function useStableCallback<T: Callback>(callback: T): T {
  const callbackRef = React.useRef<T>(callback);
  callbackRef.current = callback;

  const currentDispatcher = ReactSharedInternals.H;
  if (currentDispatcher) {
    renderDispatchers.add(currentDispatcher);
  }

  return React.useCallback<T>((...args: $ReadOnlyArray<empty>) => {
    if (renderDispatchers.has(ReactSharedInternals.H)) {
      throw new Error('useStableCallback cannot be called during render');
    }
    return callbackRef.current(...args);
  }, []);
}

export { useStableCallback };
