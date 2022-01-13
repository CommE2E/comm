// @flow

import * as React from 'react';

import { useDisconnectedBarVisibility } from 'lib/hooks/disconnected-bar';

function DisconnectedBarVisibilityHandler(): null {
  const {
    setDisconnected,
    connectionStatus,
    someRequestIsLate,
  } = useDisconnectedBarVisibility();

  const prevConnectionStatusRef = React.useRef();
  React.useEffect(() => {
    const prevConnectionStatus = prevConnectionStatusRef.current;
    prevConnectionStatusRef.current = connectionStatus;

    if (
      connectionStatus === 'connected' &&
      prevConnectionStatus !== 'connected'
    ) {
      setDisconnected(false);
    } else if (someRequestIsLate) {
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
