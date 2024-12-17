// @flow

import * as React from 'react';

import { connectionSelector } from '../selectors/keyserver-selectors.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useSelector } from '../utils/redux-utils.js';

function useWaitForConnection(): () => Promise<void> {
  const { socketState } = useTunnelbroker();

  const connection = useSelector(
    connectionSelector(authoritativeKeyserverID()),
  );

  const resolveConnectionPromise = React.useRef<?() => void>();

  const isConnectedOrUnreachable = React.useMemo(() => {
    return (
      socketState.connected &&
      (connection?.unreachable || connection?.status === 'connected')
    );
  }, [connection?.status, connection?.unreachable, socketState.connected]);

  React.useEffect(() => {
    if (isConnectedOrUnreachable) {
      resolveConnectionPromise.current?.();
    }
  }, [isConnectedOrUnreachable]);

  const waitForConnection = React.useCallback((): Promise<void> => {
    if (isConnectedOrUnreachable) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      resolveConnectionPromise.current = resolve;
    });
  }, [isConnectedOrUnreachable]);

  return waitForConnection;
}

export { useWaitForConnection };
