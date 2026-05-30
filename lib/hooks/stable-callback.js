// @flow

import * as React from 'react';

function useStableCallback<TArguments: $ReadOnlyArray<mixed>, TReturn>(
  callback: (...args: TArguments) => TReturn,
): (...args: TArguments) => TReturn {
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  return React.useCallback((...args: TArguments) => {
    return callbackRef.current(...args);
  }, []);
}

export { useStableCallback };
