// @flow

import * as React from 'react';

import { connectionSelector } from '../selectors/keyserver-selectors.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useSelector } from '../utils/redux-utils.js';

const WAITING_TIMEOUT = 5 * 1000; // 5 seconds

function useWaitForConnection(
  type: 'tunnelbroker' | 'tunnelbroker_and_keyserver',
): () => Promise<void> {
  const { socketState } = useTunnelbroker();

  const connection = useSelector(
    connectionSelector(authoritativeKeyserverID()),
  );

  const resolveConnectionPromisesCallbacks = React.useRef<
    Array<{ +callback: () => void, +timeoutID: TimeoutID }>,
  >([]);

  const isConnectedOrUnreachable = React.useMemo(() => {
    if (type === 'tunnelbroker') {
      return socketState.connected;
    }

    return (
      socketState.connected &&
      (connection?.unreachable || connection?.status === 'connected')
    );
  }, [
    connection?.status,
    connection?.unreachable,
    socketState.connected,
    type,
  ]);

  React.useEffect(() => {
    if (isConnectedOrUnreachable) {
      resolveConnectionPromisesCallbacks.current.forEach(({ timeoutID }) =>
        clearTimeout(timeoutID),
      );
      resolveConnectionPromisesCallbacks.current.forEach(({ callback }) =>
        callback(),
      );
      resolveConnectionPromisesCallbacks.current = [];
    }
  }, [isConnectedOrUnreachable]);

  const waitForConnection = React.useCallback((): Promise<void> => {
    if (isConnectedOrUnreachable) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timeoutID = setTimeout(() => {
        resolveConnectionPromisesCallbacks.current =
          resolveConnectionPromisesCallbacks.current.filter(
            ({ callback }) => callback !== resolve,
          );
        reject(new Error('Timeout while waiting for connection'));
      }, WAITING_TIMEOUT);
      resolveConnectionPromisesCallbacks.current.push({
        callback: resolve,
        timeoutID,
      });
    });
  }, [isConnectedOrUnreachable]);

  return waitForConnection;
}

export { useWaitForConnection };
