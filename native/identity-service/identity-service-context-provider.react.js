// @flow

import * as React from 'react';

import { getOneTimeKeyArray } from 'lib/shared/crypto-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import {
  type IdentityServiceClient,
  type UserLoginResponse,
  type KeyserverKeys,
  keyserverKeysValidator,
} from 'lib/types/identity-service-types.js';
import { ONE_TIME_KEYS_NUMBER } from 'lib/types/identity-service-types.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

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

  const client = React.useMemo<IdentityServiceClient>(
    () => ({
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

        if (!keyserverKeys.contentInitializationInfo.oneTimeKey) {
          throw new Error('Missing content one time key');
        }
        if (!keyserverKeys.notifInitializationInfo.oneTimeKey) {
          throw new Error('Missing notif one time key');
        }

        return assertWithValidator(keyserverKeys, keyserverKeysValidator);
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
    }),
    [getAuthMetadata],
  );

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
