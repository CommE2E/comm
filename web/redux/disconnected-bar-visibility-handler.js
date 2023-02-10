// @flow

import * as React from 'react';

import { useDisconnectedBarVisibilityHandler } from 'lib/hooks/disconnected-bar.js';

function useNetworkConnected() {
  const [networkConnected, setNetworkConnected] = React.useState(true);
  React.useEffect(() => {
    if (!window) {
      return undefined;
    }
    const handleOnline = () => setNetworkConnected(true);
    const handleOffline = () => setNetworkConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return networkConnected;
}

function DisconnectedBarVisibilityHandler(): null {
  const networkConnected = useNetworkConnected();
  useDisconnectedBarVisibilityHandler(networkConnected);
  return null;
}

export default DisconnectedBarVisibilityHandler;
