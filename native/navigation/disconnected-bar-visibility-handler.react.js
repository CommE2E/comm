// @flow

import { useDisconnectedBarVisibilityHandler } from 'lib/hooks/disconnected-bar.js';

import { useSelector } from '../redux/redux-utils.js';

function DisconnectedBarVisibilityHandler(): null {
  const networkConnected = useSelector(state => state.connectivity.connected);

  useDisconnectedBarVisibilityHandler(networkConnected);

  return null;
}

export default DisconnectedBarVisibilityHandler;
