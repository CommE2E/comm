// @flow

import * as React from 'react';
import {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE as ReactSharedInternals,
} from 'react';

type Callback = (...args: $ReadOnlyArray<empty>) => mixed;

function isRendering(): boolean {
  const dispatcher = ReactSharedInternals.H;
  return !!dispatcher && dispatcher.useState !== dispatcher.useReducer;
}

function useStableCallback<T: Callback>(callback: T): T {
  const callbackRef = React.useRef<T>(callback);
  callbackRef.current = callback;

  return React.useCallback<T>((...args: $ReadOnlyArray<empty>) => {
    if (isRendering()) {
      throw new Error('useStableCallback cannot be called during render');
    }
    return callbackRef.current(...args);
  }, []);
}

export { useStableCallback };
