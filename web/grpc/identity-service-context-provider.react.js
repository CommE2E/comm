// @flow

import * as React from 'react';

import {
  IdentityClientContext,
  type AuthMetadata,
} from 'lib/shared/identity-client-context.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';

import { IdentityServiceClientSharedProxy } from './identity-service-client-proxy.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +children: React.Node,
};
function IdentityServiceContextProvider(props: Props): React.Node {
  const { children } = props;

  const userID = useSelector(state => state.currentUserInfo?.id);
  const accessToken = useSelector(state => state.commServicesAccessToken);
  const [deviceID, setDeviceID] = React.useState<?string>(null);

  React.useEffect(() => {
    void (async () => {
      const contentSigningKey = await getContentSigningKey();
      setDeviceID(contentSigningKey);
    })();
  }, [accessToken]);

  const client = React.useMemo(() => {
    let authLayer = null;
    if (userID && deviceID && accessToken) {
      authLayer = {
        userID,
        deviceID,
        commServicesAccessToken: accessToken,
      };
    }

    return new IdentityServiceClientSharedProxy(authLayer);
  }, [accessToken, deviceID, userID]);

  const getAuthMetadata = React.useCallback<
    () => Promise<AuthMetadata>,
  >(async () => {
    const contentSigningKey = await getContentSigningKey();
    return {
      userID,
      deviceID: contentSigningKey,
      accessToken,
    };
  }, [accessToken, userID]);

  const value = React.useMemo(
    () => ({
      identityClient: client,
      getAuthMetadata,
    }),
    [client, getAuthMetadata],
  );

  return (
    <IdentityClientContext.Provider value={value}>
      {children}
    </IdentityClientContext.Provider>
  );
}

export default IdentityServiceContextProvider;
