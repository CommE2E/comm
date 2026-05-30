// @flow

import * as React from 'react';

type Callback = (...args: $ReadOnlyArray<empty>) => mixed;

function useStableCallback<T: Callback>(callback: T): T {
  const callbackRef = React.useRef<?T>();

  React.useLayoutEffect(() => {
    callbackRef.current = callback;
    return () => {
      callbackRef.current = null;
    };
  });

  return React.useCallback<T>((...args: $ReadOnlyArray<empty>) => {
    const currentCallback = callbackRef.current;
    if (!currentCallback) {
      throw new Error(
        'useStableCallback cannot be called before commit or after unmount',
      );
    }
    return currentCallback(...args);
  }, []);
}

export { useStableCallback };
