// @flow

import * as React from 'react';

import { connectionSelector } from '../selectors/keyserver-selectors.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useSelector } from '../utils/redux-utils.js';

const WAITING_TIMEOUT = 5 * 1000; // 5 seconds

function useWaitForConnection(): () => Promise<void> {
  const { socketState } = useTunnelbroker();

  const connection = useSelector(
    connectionSelector(authoritativeKeyserverID()),
  );

  const resolveConnectionPromisesCallbacks = React.useRef<(() => void)[]>([]);
  const timeoutsIDs = React.useRef<TimeoutID[]>([]);

  const isConnectedOrUnreachable = React.useMemo(() => {
    return (
      socketState.connected &&
      (connection?.unreachable || connection?.status === 'connected')
    );
  }, [connection?.status, connection?.unreachable, socketState.connected]);

  React.useEffect(() => {
    if (isConnectedOrUnreachable) {
      timeoutsIDs.current.forEach(id => clearTimeout(id));
      timeoutsIDs.current = [];
      resolveConnectionPromisesCallbacks.current.forEach(cb => cb());
      resolveConnectionPromisesCallbacks.current = [];
    }
  }, [isConnectedOrUnreachable]);

  const waitForConnection = React.useCallback((): Promise<void> => {
    if (isConnectedOrUnreachable) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      resolveConnectionPromisesCallbacks.current.push(resolve);
      timeoutsIDs.current.push(
        setTimeout(() => {
          resolveConnectionPromisesCallbacks.current =
            resolveConnectionPromisesCallbacks.current.filter(
              cb => cb !== resolve,
            );
          reject(new Error('Timeout while waiting for connection'));
        }, WAITING_TIMEOUT),
      );
    });
  }, [isConnectedOrUnreachable]);

  return waitForConnection;
}

export { useWaitForConnection };
