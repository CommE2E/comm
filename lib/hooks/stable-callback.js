// @flow

import * as React from 'react';

type Callback = (...args: $ReadOnlyArray<empty>) => mixed;

function useStableCallback<T: Callback>(callback: T): T {
  const callbackRef = React.useRef<T>(callback);
  callbackRef.current = callback;

  // $FlowExpectedError[incompatible-call] Preserves T at runtime.
  return React.useCallback<T>((...args: $ReadOnlyArray<empty>) => {
    return callbackRef.current(...args);
  }, []);
}

export { useStableCallback };
