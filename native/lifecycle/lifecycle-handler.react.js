// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';
import { AppState as NativeAppState } from 'react-native';

import {
  backgroundActionType,
  foregroundActionType,
} from 'lib/reducers/foreground-reducer';

import { appBecameInactive } from '../redux/redux-setup';

const LifecycleHandler = React.memo<{||}>(() => {
  const dispatch = useDispatch();

  const lastStateRef = React.useRef();
  const onLifecycleChange = React.useCallback(
    (nextState: ?string) => {
      if (!nextState || nextState === 'unknown') {
        return;
      }
      const lastState = lastStateRef.current;
      lastStateRef.current = nextState;
      if (lastState === 'background' && nextState === 'active') {
        dispatch({ type: foregroundActionType, payload: null });
      } else if (lastState !== 'background' && nextState === 'background') {
        dispatch({ type: backgroundActionType, payload: null });
        appBecameInactive();
      }
    },
    [lastStateRef, dispatch],
  );

  React.useEffect(() => {
    NativeAppState.addEventListener('change', onLifecycleChange);
    return () => {
      NativeAppState.removeEventListener('change', onLifecycleChange);
    };
  }, [onLifecycleChange]);

  return null;
});
LifecycleHandler.displayName = 'LifecycleHandler';

export default LifecycleHandler;
