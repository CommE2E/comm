// @flow

import invariant from 'invariant';
import * as React from 'react';

import { connectionSelector } from '../selectors/keyserver-selectors.js';
import { updateDisconnectedBarActionType } from '../types/socket-types.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

function useDisconnectedBarVisibilityHandler(networkConnected: boolean): void {
  const dispatch = useDispatch();

  const setDisconnected = React.useCallback(
    (newDisconnected: boolean) => {
      dispatch({
        type: updateDisconnectedBarActionType,
        payload: { visible: newDisconnected, keyserverID: ashoatKeyserverID },
      });
    },
    [dispatch],
  );

  React.useEffect(() => {
    setDisconnected(!networkConnected);
  }, [networkConnected, setDisconnected]);
}

function useShouldShowDisconnectedBar(): {
  +disconnected: boolean,
  +shouldShowDisconnectedBar: boolean,
} {
  const connection = useSelector(connectionSelector(ashoatKeyserverID));
  invariant(connection, 'keyserver missing from keyserverStore');
  const disconnected = connection.showDisconnectedBar;
  const socketConnected = connection.status === 'connected';

  const shouldShowDisconnectedBar = disconnected || !socketConnected;
  return { disconnected, shouldShowDisconnectedBar };
}

type DisconnectedBarCause = 'connecting' | 'disconnected';

function useDisconnectedBar(
  changeShowing: boolean => void,
): DisconnectedBarCause {
  const { disconnected, shouldShowDisconnectedBar } =
    useShouldShowDisconnectedBar();

  const prevShowDisconnectedBar = React.useRef<?boolean>();
  React.useEffect(() => {
    const wasShowing = prevShowDisconnectedBar.current;
    if (shouldShowDisconnectedBar && wasShowing === false) {
      changeShowing(true);
    } else if (!shouldShowDisconnectedBar && wasShowing) {
      changeShowing(false);
    }
    prevShowDisconnectedBar.current = shouldShowDisconnectedBar;
  }, [shouldShowDisconnectedBar, changeShowing]);

  const [barCause, setBarCause] =
    React.useState<DisconnectedBarCause>('connecting');
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
  useDisconnectedBarVisibilityHandler,
  useShouldShowDisconnectedBar,
  useDisconnectedBar,
};
