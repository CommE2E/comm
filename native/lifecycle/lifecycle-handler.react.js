// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateLifecycleStateActionType } from 'lib/reducers/lifecycle-state-reducer';
import type { LifecycleState } from 'lib/types/lifecycle-state-types';

import { appBecameInactive } from '../redux/redux-setup';
import { addLifecycleListener } from './lifecycle';

const LifecycleHandler = React.memo<{||}>(() => {
  const dispatch = useDispatch();

  const lastStateRef = React.useRef();
  const onLifecycleChange = React.useCallback(
    (nextState: ?LifecycleState) => {
      if (!nextState || nextState === 'unknown') {
        return;
      }
      const lastState = lastStateRef.current;
      lastStateRef.current = nextState;
      if (
        (lastState === 'background' || lastState === 'inactive') &&
        nextState === 'active'
      ) {
        dispatch({ type: updateLifecycleStateActionType, payload: 'active' });
      } else if (
        lastState !== 'background' &&
        lastState !== 'inactive' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        dispatch({
          type: updateLifecycleStateActionType,
          payload: nextState,
        });
        appBecameInactive();
      }
    },
    [lastStateRef, dispatch],
  );

  React.useEffect(() => {
    const subscription = addLifecycleListener(onLifecycleChange);
    return () => subscription.remove();
  }, [onLifecycleChange]);

  return null;
});
LifecycleHandler.displayName = 'LifecycleHandler';

export default LifecycleHandler;
