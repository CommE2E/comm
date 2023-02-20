// @flow

import NetInfo from '@react-native-community/netinfo';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateConnectivityActiveType } from './action-types.js';
import { useSelector } from './redux-utils.js';

export default function ConnectivityUpdater(): null {
  const connectivity = useSelector(state => state.connectivity);
  const dispatch = useDispatch();

  const onConnectionChange = React.useCallback(
    ({ type }) => {
      const connected = type !== 'none' && type !== 'unknown';
      const hasWiFi = type === 'wifi';
      if (
        connected === connectivity.connected &&
        hasWiFi === connectivity.hasWiFi
      ) {
        return;
      }
      dispatch({
        type: updateConnectivityActiveType,
        payload: {
          connected,
          hasWiFi,
        },
      });
    },
    [connectivity, dispatch],
  );
  React.useEffect(() => {
    NetInfo.fetch().then(onConnectionChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(
    () => NetInfo.addEventListener(onConnectionChange),
    [onConnectionChange],
  );
  return null;
}
