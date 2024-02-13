// @flow

import * as React from 'react';

import type { AuthMessage } from 'lib/types/identity-search/auth-message-types.js';

import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

function useIdentitySearchAuthMessage(): ?AuthMessage {
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
      type: 'AuthMessage',
      deviceID,
      accessToken,
      userID,
    }: AuthMessage);
  }, [accessToken, deviceID, userID]);
}

export { useIdentitySearchAuthMessage };
