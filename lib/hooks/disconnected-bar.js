// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateDisconnectedBarActionType } from '../types/socket-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useDisconnectedBarVisibilityHandler(networkConnected: boolean): void {
  const dispatch = useDispatch();
  const disconnected = useSelector(
    state => state.connection.showDisconnectedBar,
  );
  const setDisconnected = React.useCallback(
    (newDisconnected: boolean) => {
      if (newDisconnected === disconnected) {
        return;
      }
      dispatch({
        type: updateDisconnectedBarActionType,
        payload: { visible: newDisconnected },
      });
    },
    [disconnected, dispatch],
  );

  const networkActiveRef = React.useRef(true);
  React.useEffect(() => {
    networkActiveRef.current = networkConnected;
    if (!networkConnected) {
      setDisconnected(true);
    }
  }, [setDisconnected, networkConnected]);

  const prevConnectionStatusRef = React.useRef();
  const connectionStatus = useSelector(state => state.connection.status);
  const someRequestIsLate = useSelector(
    state => state.connection.lateResponses.length !== 0,
  );
  React.useEffect(() => {
    const prevConnectionStatus = prevConnectionStatusRef.current;
    prevConnectionStatusRef.current = connectionStatus;

    if (
      connectionStatus === 'connected' &&
      prevConnectionStatus !== 'connected'
    ) {
      // Sometimes NetInfo misses the network coming back online for some
      // reason. But if the socket reconnects, the network must be up
      networkActiveRef.current = true;
      setDisconnected(false);
    } else if (!networkActiveRef.current || someRequestIsLate) {
      setDisconnected(true);
    } else if (
      connectionStatus === 'reconnecting' ||
      connectionStatus === 'forcedDisconnecting'
    ) {
      setDisconnected(true);
    } else if (connectionStatus === 'connected') {
      setDisconnected(false);
    }
  }, [connectionStatus, someRequestIsLate, setDisconnected]);
}

function useShouldShowDisconnectedBar(): {
  +disconnected: boolean,
  +shouldShowDisconnectedBar: boolean,
} {
  const disconnected = useSelector(
    state => state.connection.showDisconnectedBar,
  );
  const socketConnected = useSelector(
    state => state.connection.status === 'connected',
  );

  const shouldShowDisconnectedBar = disconnected || !socketConnected;
  return { disconnected, shouldShowDisconnectedBar };
}

type DisconnectedBarCause = 'connecting' | 'disconnected';

function useDisconnectedBar(
  changeShowing: boolean => void,
): DisconnectedBarCause {
  const { disconnected, shouldShowDisconnectedBar } =
    useShouldShowDisconnectedBar();

  const prevShowDisconnectedBar = React.useRef();
  React.useEffect(() => {
    const wasShowing = prevShowDisconnectedBar.current;
    if (shouldShowDisconnectedBar && wasShowing === false) {
      changeShowing(true);
    } else if (!shouldShowDisconnectedBar && wasShowing) {
      changeShowing(false);
    }
    prevShowDisconnectedBar.current = shouldShowDisconnectedBar;
  }, [shouldShowDisconnectedBar, changeShowing]);

  const [barCause, setBarCause] =
    React.useState<DisconnectedBarCause>('connecting');
  React.useEffect(() => {
    if (shouldShowDisconnectedBar && disconnected) {
      setBarCause('disconnected');
    } else if (shouldShowDisconnectedBar) {
      setBarCause('connecting');
    }
  }, [shouldShowDisconnectedBar, disconnected]);
  return barCause;
}

export {
  useDisconnectedBarVisibilityHandler,
  useShouldShowDisconnectedBar,
  useDisconnectedBar,
};
