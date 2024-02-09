// @flow

import invariant from 'invariant';
import * as React from 'react';

import { updateKeyserverReachabilityActionType } from '../keyserver-conn/keyserver-conn-types.js';
import { connectionSelector } from '../selectors/keyserver-selectors.js';
import type { ConnectionStatus } from '../types/socket-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

function useKeyserverReachabilityHandler(networkConnected: boolean): void {
  const dispatch = useDispatch();
  const connection = useSelector(connectionSelector(authoritativeKeyserverID));
  invariant(connection, 'keyserver missing from keyserverStore');

  const disconnected = connection.unreachable;
  const setDisconnected = React.useCallback(
    (newDisconnected: boolean) => {
      if (newDisconnected === disconnected) {
        return;
      }
      dispatch({
        type: updateKeyserverReachabilityActionType,
        payload: {
          visible: newDisconnected,
          keyserverID: authoritativeKeyserverID,
        },
      });
    },
    [disconnected, dispatch],
  );

  const networkActiveRef = React.useRef<boolean>(true);
  React.useEffect(() => {
    networkActiveRef.current = networkConnected;
    if (!networkConnected) {
      setDisconnected(true);
    }
  }, [setDisconnected, networkConnected]);

  const prevConnectionStatusRef = React.useRef<?ConnectionStatus>();
  const connectionStatus = connection.status;
  const someRequestIsLate = connection.lateResponses.length !== 0;
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

export { useKeyserverReachabilityHandler };
