// @flow

import invariant from 'invariant';
import * as React from 'react';

type Callback = (...args: $ReadOnlyArray<empty>) => mixed;

type ReactDispatcher = {
  +useState: mixed,
  +useReducer: mixed,
  ...
};

type ReactSharedInternalsType = {
  +H: null | ReactDispatcher,
  ...
};

const reactSharedInternalsDescriptor =
  Object.getOwnPropertyDescriptor<ReactSharedInternalsType>(
    React,
    '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
  );

invariant(
  reactSharedInternalsDescriptor?.value,
  'React shared internals should be available',
);
const ReactSharedInternals: ReactSharedInternalsType =
  reactSharedInternalsDescriptor.value;

function isRendering(): boolean {
  const dispatcher = ReactSharedInternals.H;
  return !!dispatcher && dispatcher.useState !== dispatcher.useReducer;
}

function useStableCallback<T: Callback>(callback: T): T {
  const callbackRef = React.useRef<T>(callback);
  callbackRef.current = callback;

  // $FlowExpectedError[incompatible-call] Preserves T at runtime.
  return React.useCallback<T>((...args: $ReadOnlyArray<empty>) => {
    if (isRendering()) {
      throw new Error('useStableCallback cannot be called during render');
    }
    return callbackRef.current(...args);
  }, []);
}

export { useStableCallback };
