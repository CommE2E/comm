// @flow

import * as React from 'react';

import { useIsUserDataReady } from 'lib/hooks/backup-hooks.js';
import { updateLifecycleStateActionType } from 'lib/reducers/lifecycle-state-reducer.js';
import type { LifecycleState } from 'lib/types/lifecycle-state-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import sleep from 'lib/utils/sleep.js';

import { addLifecycleListener, getCurrentLifecycleState } from './lifecycle.js';
import { appBecameInactive } from '../redux/redux-setup.js';
import { useSelector } from '../redux/redux-utils.js';

const LifecycleHandler: React.ComponentType<{}> = React.memo(
  function LifecycleHandler() {
    const dispatch = useDispatch();

    const currentState = useSelector(state => state.lifecycleState);
    const lastStateRef = React.useRef(currentState);

    const onLifecycleChange = React.useCallback(
      (nextState: ?(LifecycleState | 'unknown')) => {
        if (!nextState || nextState === 'unknown') {
          return;
        }
        const lastState = lastStateRef.current;
        lastStateRef.current = nextState;
        if (nextState !== lastState) {
          dispatch({
            type: updateLifecycleStateActionType,
            payload: nextState,
          });
        }
        if (
          lastState !== 'background' &&
          lastState !== 'inactive' &&
          (nextState === 'background' || nextState === 'inactive')
        ) {
          appBecameInactive();
        }
      },
      [dispatch],
    );

    React.useEffect(() => {
      const subscription = addLifecycleListener(onLifecycleChange);
      return () => subscription.remove();
    }, [onLifecycleChange]);

    React.useEffect(() => {
      onLifecycleChange(getCurrentLifecycleState());
      // We update the current state when this component first renders
      // in case something happened before PersistGate let us render
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const userDataReady = useIsUserDataReady();
    const prevUserDataReadyRef = React.useRef(userDataReady);
    React.useEffect(() => {
      void (async () => {
        if (prevUserDataReadyRef.current === userDataReady) {
          return;
        }
        prevUserDataReadyRef.current = userDataReady;
        if (!userDataReady) {
          return;
        }
        // Backup restore just completed (userDataReady went from false to true)
        // Sometimes the backup restore causes "thrashing", which can lead to
        // lifecycleState getting out of sync. We refresh after the restore
        // concludes to address this. See ENG-11465
        await sleep(100);
        onLifecycleChange(getCurrentLifecycleState());
      })();
    }, [userDataReady, onLifecycleChange]);

    return null;
  },
);
LifecycleHandler.displayName = 'LifecycleHandler';

export default LifecycleHandler;
