// @flow

import type { NavigationState } from '@react-navigation/core';
import * as React from 'react';

import { actionLogger } from 'lib/utils/action-logger.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { setReduxStateActionType } from './action-types.js';
import { useSelector } from './redux-utils.js';
import type { AppState } from './state-types.js';
import { setNavStateActionType } from '../navigation/action-types.js';
import { NavContext } from '../navigation/navigation-context.js';

type MonitorAction =
  | { +type: 'DISPATCH', +state: string, ... }
  | { +type: 'IMPORT', ... };
export type MonitorActionState = $ReadOnly<{
  ...AppState,
  +navState: NavigationState,
}>;

const DevTools: React.ComponentType<{}> = React.memo(function DevTools() {
  const devToolsRef = React.useRef();
  if (
    global.__REDUX_DEVTOOLS_EXTENSION__ &&
    devToolsRef.current === undefined
  ) {
    devToolsRef.current = global.__REDUX_DEVTOOLS_EXTENSION__.connect({
      name: 'Comm',
      features: {
        pause: false,
        lock: false,
        persist: false,
        export: false,
        import: false,
        jump: true,
        skip: false,
        reorder: false,
        dispatch: false,
        test: false,
      },
    });
  }
  const devTools = devToolsRef.current;

  const navContext = React.useContext(NavContext);
  const initialReduxState = useSelector(state => state);

  React.useEffect(() => {
    if (devTools && navContext) {
      devTools.init({ ...initialReduxState, navState: navContext.state });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devTools, !navContext]);

  const postActionToMonitor = React.useCallback(
    (action: Object, state: Object) => {
      if (!devTools) {
        return;
      } else if (
        (action.type === setNavStateActionType ||
          action.type === setReduxStateActionType) &&
        action.payload.hideFromMonitor
      ) {
        // Triggered by handleActionFromMonitor below when somebody is
        // stepping through actions in the Comm monitor in Redux dev tools
        return;
      } else if (action.type === setNavStateActionType) {
        // Triggered by NavFromReduxHandler when somebody imports state into
        // the Redux monitor in Redux dev tools
        devTools.init(state);
      } else {
        devTools.send(action, state);
      }
    },
    [devTools],
  );

  React.useEffect(() => {
    actionLogger.subscribe(postActionToMonitor);
    return () => actionLogger.unsubscribe(postActionToMonitor);
  }, [postActionToMonitor]);

  const reduxDispatch = useDispatch();
  const navDispatch = React.useMemo(
    () => (navContext ? navContext.dispatch : null),
    [navContext],
  );

  const setInternalState = React.useCallback(
    (state: MonitorActionState) => {
      const { navState, ...reduxState } = state;
      if (navDispatch) {
        navDispatch({
          type: setNavStateActionType,
          payload: {
            state: navState,
            hideFromMonitor: true,
          },
        });
      } else {
        console.log('could not set state in ReactNav');
      }
      reduxDispatch({
        type: setReduxStateActionType,
        payload: {
          state: reduxState,
          hideFromMonitor: true,
        },
      });
    },
    [reduxDispatch, navDispatch],
  );

  const handleActionFromMonitor = React.useCallback(
    (monitorAction: MonitorAction) => {
      if (!devTools) {
        return;
      }
      if (monitorAction.type === 'DISPATCH') {
        const state = JSON.parse(monitorAction.state);
        setInternalState(state);
      } else if (monitorAction.type === 'IMPORT') {
        console.log('you should import using the Redux monitor!');
      }
    },
    [devTools, setInternalState],
  );

  React.useEffect(() => {
    if (!devTools) {
      return undefined;
    }
    const unsubscribe = devTools.subscribe(handleActionFromMonitor);
    return unsubscribe;
  }, [devTools, handleActionFromMonitor]);

  return null;
});
DevTools.displayName = 'DevTools';

export default DevTools;
