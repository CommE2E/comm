// @flow

import * as React from 'react';

import type { ConnectionInitializationMessage } from 'lib/types/tunnelbroker/session-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';

import { useSelector } from '../redux/redux-utils.js';

function useTunnelbrokerInitMessage(): ?ConnectionInitializationMessage {
  const [deviceID, setDeviceID] = React.useState<?string>();
  const accessToken = useSelector(state => state.commServicesAccessToken);
  const userID = useSelector(state => state.currentUserInfo?.id);

  React.useEffect(() => {
    void (async () => {
      const contentSigningKey = await getContentSigningKey();
      setDeviceID(contentSigningKey);
    })();
  }, [accessToken]);

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
