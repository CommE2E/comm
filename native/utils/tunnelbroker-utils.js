// @flow

import * as React from 'react';

import type { ConnectionInitializationMessage } from 'lib/types/tunnelbroker/session-types.js';

import { getContentSigningKey } from './crypto-utils.js';
import { useSelector } from '../redux/redux-utils.js';

function useTunnelbrokerInitMessage(): ?ConnectionInitializationMessage {
  const [deviceID, setDeviceID] = React.useState<?string>();
  const userID = useSelector(state => state.currentUserInfo?.id);
  const accessToken = useSelector(state => state.commServicesAccessToken);

  React.useEffect(() => {
    (async () => {
      const contentSigningKey = await getContentSigningKey();
      setDeviceID(contentSigningKey);
    })();
  }, []);

  return React.useMemo(() => {
    if (!deviceID || !accessToken || !userID) {
      return null;
    }
    return ({
      type: 'ConnectionInitializationMessage',
      deviceID,
      accessToken,
      userID,
      deviceType: 'mobile',
    }: ConnectionInitializationMessage);
  }, [accessToken, deviceID, userID]);
}

export { useTunnelbrokerInitMessage };
