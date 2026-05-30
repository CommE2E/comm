// @flow

import * as React from 'react';

function useStableCallback<TArguments: $ReadOnlyArray<mixed>, TReturn>(
  callback: (...args: TArguments) => TReturn,
): (...args: TArguments) => TReturn {
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  const stableCallback = React.useCallback(
    (...args: $ReadOnlyArray<empty>) => {
      return callbackRef.current(...((args: any): TArguments));
    },
    [],
  );

  return (stableCallback: any);
}

export { useStableCallback };
