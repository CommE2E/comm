// @flow

import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import type { SetState } from '../types/hook-types.js';

function useResettingState<T>(
  initialState: (() => T) | T,
  duration: number,
): [T, SetState<T>] {
  const [value, setValue] = React.useState(initialState);
  const resetStatusAfterTimeout = React.useRef(
    _debounce(() => setValue(initialState), duration),
  );
  React.useEffect(() => resetStatusAfterTimeout.current.cancel, []);

  const setNewValue = React.useCallback((newValue: (T => T) | T) => {
    setValue(newValue);
    resetStatusAfterTimeout.current();
  }, []);

  return React.useMemo(() => [value, setNewValue], [setNewValue, value]);
}

export { useResettingState };
