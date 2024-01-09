// @flow

import * as React from 'react';

import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type { IdentityServiceClient } from 'lib/types/identity-service-types.js';

import { IdentityServiceClientWrapper } from './identity-service-client-wrapper.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +children: React.Node,
};
function IdentityServiceContextProvider(props: Props): React.Node {
  const { children } = props;
  const [client, setClient] = React.useState<?IdentityServiceClient>();

  const userID = useSelector(state => state.currentUserInfo?.id);
  const accessToken = useSelector(state => state.commServicesAccessToken);
  const deviceID = useSelector(
    state => state.cryptoStore?.primaryIdentityKeys.ed25519,
  );

  React.useEffect(() => {
    let authLayer = null;
    if (userID && deviceID && accessToken) {
      authLayer = {
        userID,
        deviceID,
        commServicesAccessToken: accessToken,
      };
    }
    setClient(new IdentityServiceClientWrapper(authLayer));
  }, [accessToken, deviceID, userID]);

  const value = React.useMemo(
    () => ({
      identityClient: client,
    }),
    [client],
  );

  return (
    <IdentityClientContext.Provider value={value}>
      {children}
    </IdentityClientContext.Provider>
  );
}

export default IdentityServiceContextProvider;
