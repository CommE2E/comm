// @flow

import * as React from 'react';

import { useDisconnectedBarVisibility } from 'lib/hooks/disconnected-bar';

import { useSelector } from '../redux/redux-utils';

function DisconnectedBarVisibilityHandler(): null {
  const {
    setDisconnected,
    connectionStatus,
    someRequestIsLate,
  } = useDisconnectedBarVisibility();

  const networkActiveRef = React.useRef(true);
  const networkConnected = useSelector(state => state.connectivity.connected);
  React.useEffect(() => {
    networkActiveRef.current = networkConnected;
    if (!networkConnected) {
      setDisconnected(true);
    }
  }, [setDisconnected, networkConnected]);

  const prevConnectionStatusRef = React.useRef();
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

  return null;
}

export default DisconnectedBarVisibilityHandler;
