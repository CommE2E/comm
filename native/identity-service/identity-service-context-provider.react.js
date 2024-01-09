// @flow

import * as React from 'react';

import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type {
  IdentityServiceClient,
  OutboundKeyInfoResponse,
} from 'lib/types/identity-service-types.js';

import { commRustModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

type Props = {
  +children: React.Node,
};
function IdentityServiceContextProvider(props: Props): React.Node {
  const { children } = props;

  const userID = useSelector(state => state.currentUserInfo?.id);
  const accessToken = useSelector(state => state.commServicesAccessToken);
  const [deviceID, setDeviceID] = React.useState<?string>();

  React.useEffect(() => {
    void (async () => {
      const contentSigningKey = await getContentSigningKey();
      setDeviceID(contentSigningKey);
    })();
  }, []);

  const client = React.useMemo<?IdentityServiceClient>(() => {
    if (!userID || !deviceID || !accessToken) {
      return null;
    }
    return {
      deleteUser: () =>
        commRustModule.deleteUser(userID, deviceID, accessToken),
      getKeyserverKeys: async (keyserverID: string) => {
        const result = await commRustModule.getKeyserverKeys(
          userID,
          deviceID,
          accessToken,
          keyserverID,
        );
        const resultObject: OutboundKeyInfoResponse = JSON.parse(result);
        if (
          !resultObject.payload ||
          !resultObject.payloadSignature ||
          !resultObject.contentPrekey ||
          !resultObject.contentPrekeySignature ||
          !resultObject.notifPrekey ||
          !resultObject.notifPrekeySignature
        ) {
          return null;
        }
        return resultObject;
      },
    };
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
