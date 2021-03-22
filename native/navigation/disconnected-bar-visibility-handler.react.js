// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateDisconnectedBarActionType } from 'lib/types/socket-types';

import { useSelector } from '../redux/redux-utils';

function DisconnectedBarVisibilityHandler() {
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
  const networkConnected = useSelector(state => state.connectivity.connected);
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

  return null;
}

export default DisconnectedBarVisibilityHandler;
