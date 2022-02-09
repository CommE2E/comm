// @flow

import { useDisconnectedBarVisibilityHandler } from 'lib/hooks/disconnected-bar';

import { useSelector } from '../redux/redux-utils';

function DisconnectedBarVisibilityHandler(): null {
  const networkConnected = useSelector(state => state.connectivity.connected);

  useDisconnectedBarVisibilityHandler(networkConnected);

  return null;
}

export default DisconnectedBarVisibilityHandler;
