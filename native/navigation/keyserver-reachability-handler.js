// @flow

import { useKeyserverReachabilityHandler } from 'lib/hooks/keyserver-reachability.js';

import { useSelector } from '../redux/redux-utils.js';

function KeyserverReachabilityHandler(): null {
  const networkConnected = useSelector(state => state.connectivity.connected);

  useKeyserverReachabilityHandler(networkConnected);

  return null;
}

export default KeyserverReachabilityHandler;
