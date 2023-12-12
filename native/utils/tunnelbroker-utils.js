// @flow

import * as React from 'react';

import type { ConnectionInitializationMessage } from 'lib/types/tunnelbroker/session-types.js';

import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

function useTunnelbrokerInitMessage(): ?ConnectionInitializationMessage {
  const [deviceID, setDeviceID] = React.useState<?string>();
  const [userID, setUserID] = React.useState<?string>();
  const accessToken = useSelector(state => state.commServicesAccessToken);

  React.useEffect(() => {
    void (async () => {
      const { userID: identityUserID, deviceID: contentSigningKey } =
        await commCoreModule.getCommServicesAuthMetadata();
      setDeviceID(contentSigningKey);
      setUserID(identityUserID);
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
