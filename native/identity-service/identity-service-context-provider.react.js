// @flow

import * as React from 'react';

import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import {
  type IdentityServiceClient,
  type UserLoginResponse,
  type KeyserverKeys,
  keyserverKeysValidator,
} from 'lib/types/identity-service-types.js';

import { getCommServicesAuthMetadataEmitter } from '../event-emitters/csa-auth-metadata-emitter.js';
import { commCoreModule, commRustModule } from '../native-modules.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

type Props = {
  +children: React.Node,
};
function IdentityServiceContextProvider(props: Props): React.Node {
  const { children } = props;

  const authMetadataPromiseRef =
    React.useRef<?Promise<{ +userID: ?string, +accessToken: ?string }>>();
  if (!authMetadataPromiseRef.current) {
    authMetadataPromiseRef.current = (async () => {
      const { userID, accessToken } =
        await commCoreModule.getCommServicesAuthMetadata();
      return { userID, accessToken };
    })();
  }

  React.useEffect(() => {
    const metadataEmitter = getCommServicesAuthMetadataEmitter();
    const subscription = metadataEmitter.addListener(
      'commServicesAuthMetadata',
      (authMetadata: UserLoginResponse) => {
        authMetadataPromiseRef.current = Promise.resolve({
          userID: authMetadata.userId,
          accessToken: authMetadata.accessToken,
        });
      },
    );
    return () => subscription.remove();
  }, []);

  const getAuthMetadata = React.useCallback<
    () => Promise<{
      +deviceID: string,
      +userID: string,
      +accessToken: string,
    }>,
  >(async () => {
    const deviceID = await getContentSigningKey();
    const authMetadata = await authMetadataPromiseRef.current;
    const userID = authMetadata?.userID;
    const accessToken = authMetadata?.accessToken;
    if (!deviceID || !userID || !accessToken) {
      throw new Error('Identity service client is not initialized');
    }
    return { deviceID, userID, accessToken };
  }, []);

  const client = React.useMemo<IdentityServiceClient>(() => {
    return {
      deleteUser: async () => {
        const { deviceID, userID, accessToken } = await getAuthMetadata();
        return commRustModule.deleteUser(userID, deviceID, accessToken);
      },
      getKeyserverKeys: async (keyserverID: string): Promise<KeyserverKeys> => {
        const { deviceID, userID, accessToken } = await getAuthMetadata();
        const result = await commRustModule.getKeyserverKeys(
          userID,
          deviceID,
          accessToken,
          keyserverID,
        );
        const resultObject = JSON.parse(result);
        const payload = resultObject?.payload;

        const keyserverKeys = {
          identityKeysBlob: payload ? JSON.parse(payload) : null,
          contentInitializationInfo: {
            prekey: resultObject?.contentPrekey,
            prekeySignature: resultObject?.contentPrekeySignature,
            oneTimeKey: resultObject?.oneTimeContentPrekey,
          },
          notifInitializationInfo: {
            prekey: resultObject?.notifPrekey,
            prekeySignature: resultObject?.notifPrekeySignature,
            oneTimeKey: resultObject?.oneTimeNotifPrekey,
          },
          payloadSignature: resultObject?.payloadSignature,
          socialProof: resultObject?.socialProof,
        };

        if (!keyserverKeysValidator.is(keyserverKeys)) {
          throw new Error('Invalid response from Identity service');
        }
        return (keyserverKeys: any);
      },
    };
  }, [getAuthMetadata]);

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
