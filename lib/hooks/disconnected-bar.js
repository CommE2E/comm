// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  updateDisconnectedBarActionType,
  type ConnectionStatus,
} from '../types/socket-types';
import { useSelector } from '../utils/redux-utils';

function useDisconnectedBarVisibility(): {
  setDisconnected: boolean => void,
  connectionStatus: ConnectionStatus,
  someRequestIsLate: boolean,
} {
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

  const connectionStatus = useSelector(state => state.connection.status);
  const someRequestIsLate = useSelector(
    state => state.connection.lateResponses.length !== 0,
  );
  return {
    setDisconnected,
    connectionStatus,
    someRequestIsLate,
  };
}

function useShouldShowDisconnectedBar(): {
  disconnected: boolean,
  shouldShowDisconnectedBar: boolean,
} {
  const disconnected = useSelector(
    state => state.connection.showDisconnectedBar,
  );
  const socketConnected = useSelector(
    state => state.connection.status === 'connected',
  );

  const shouldShowDisconnectedBar = disconnected || !socketConnected;
  return { disconnected, shouldShowDisconnectedBar };
}

type DisconnectedBarCause = 'connecting' | 'disconnected';

function useDisconnectedBar(
  changeShowing: number => void,
): DisconnectedBarCause {
  const {
    disconnected,
    shouldShowDisconnectedBar,
  } = useShouldShowDisconnectedBar();

  const prevShowDisconnectedBar = React.useRef();
  React.useEffect(() => {
    const wasShowing = prevShowDisconnectedBar.current;
    if (shouldShowDisconnectedBar && wasShowing === false) {
      changeShowing(1);
    } else if (!shouldShowDisconnectedBar && wasShowing) {
      changeShowing(0);
    }
    prevShowDisconnectedBar.current = shouldShowDisconnectedBar;
  }, [shouldShowDisconnectedBar, changeShowing]);

  const [barCause, setBarCause] = React.useState('connecting');
  React.useEffect(() => {
    if (shouldShowDisconnectedBar && disconnected) {
      setBarCause('disconnected');
    } else if (shouldShowDisconnectedBar) {
      setBarCause('connecting');
    }
  }, [shouldShowDisconnectedBar, disconnected]);
  return barCause;
}

export {
  useDisconnectedBarVisibility,
  useShouldShowDisconnectedBar,
  useDisconnectedBar,
};
