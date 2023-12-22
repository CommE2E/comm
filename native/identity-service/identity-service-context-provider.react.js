// @flow

import * as React from 'react';

import { getOneTimeKeyArray } from 'lib/shared/crypto-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type {
  IdentityServiceClient,
  OutboundKeyInfoResponse,
  UserLoginResponse,
} from 'lib/types/identity-service-types.js';
import { ONE_TIME_KEYS_NUMBER } from 'lib/types/identity-service-types.js';

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

  const client = React.useMemo<?IdentityServiceClient>(() => {
    return {
      deleteUser: async () => {
        const { deviceID, userID, accessToken } = await getAuthMetadata();
        return commRustModule.deleteUser(userID, deviceID, accessToken);
      },
      getKeyserverKeys: async (keyserverID: string) => {
        const { deviceID, userID, accessToken } = await getAuthMetadata();
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
          throw new Error('Invalid response from Identity service');
        }
        return resultObject;
      },
      registerUser: async (username: string, password: string) => {
        await commCoreModule.initializeCryptoAccount();
        const [
          { blobPayload, signature },
          notificationsOneTimeKeys,
          primaryOneTimeKeys,
          prekeys,
        ] = await Promise.all([
          commCoreModule.getUserPublicKey(),
          commCoreModule.getNotificationsOneTimeKeys(ONE_TIME_KEYS_NUMBER),
          commCoreModule.getPrimaryOneTimeKeys(ONE_TIME_KEYS_NUMBER),
          commCoreModule.generateAndGetPrekeys(),
        ]);
        const registrationResult = await commRustModule.registerUser(
          username,
          password,
          blobPayload,
          signature,
          prekeys.contentPrekey,
          prekeys.contentPrekeySignature,
          prekeys.notifPrekey,
          prekeys.notifPrekeySignature,
          getOneTimeKeyArray(primaryOneTimeKeys),
          getOneTimeKeyArray(notificationsOneTimeKeys),
        );
        const { userID, accessToken } = JSON.parse(registrationResult);
        return { accessToken, userID, username };
      },
      logInPasswordUser: async (
        username: string,
        password: string,
        keyPayload: string,
        keyPayloadSignature: string,
        contentPrekey: string,
        contentPrekeySignature: string,
        notifPrekey: string,
        notifPrekeySignature: string,
        contentOneTimeKeys: Array<string>,
        notifOneTimeKeys: Array<string>,
      ) => {
        const loginResult = await commRustModule.logInPasswordUser(
          username,
          password,
          keyPayload,
          keyPayloadSignature,
          contentPrekey,
          contentPrekeySignature,
          notifPrekey,
          notifPrekeySignature,
          contentOneTimeKeys,
          notifOneTimeKeys,
        );
        const { userID, accessToken } = JSON.parse(loginResult);
        return { accessToken, userID, username };
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
