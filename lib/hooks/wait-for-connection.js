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

  const [connectionPromises, setConnectionPromises] = React.useState<
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
    if (connectionPromises.length === 0) {
      return;
    }
    if (isConnectedOrUnreachable) {
      connectionPromises.forEach(({ timeoutID }) => clearTimeout(timeoutID));
      connectionPromises.forEach(({ callback }) => callback());
      setConnectionPromises([]);
    }
  }, [isConnectedOrUnreachable, connectionPromises]);

  const waitForConnection = React.useCallback((): Promise<void> => {
    if (isConnectedOrUnreachable) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timeoutID = setTimeout(() => {
        setConnectionPromises(currentPromises =>
          currentPromises.filter(({ callback }) => callback !== resolve),
        );
        reject(new Error('Timeout while waiting for connection'));
      }, WAITING_TIMEOUT);

      setConnectionPromises(currentPromises => [
        ...currentPromises,
        { callback: resolve, timeoutID },
      ]);
    });
  }, [isConnectedOrUnreachable]);

  return waitForConnection;
}

export { useWaitForConnection };
