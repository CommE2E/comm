// @flow

import * as React from 'react';

import { useKeyserverReachabilityHandler } from 'lib/hooks/keyserver-reachability.js';

function useNetworkConnected(): boolean {
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

function KeyserverReachabilityHandler(): null {
  const networkConnected = useNetworkConnected();
  useKeyserverReachabilityHandler(networkConnected);
  return null;
}

export { useNetworkConnected, KeyserverReachabilityHandler };
