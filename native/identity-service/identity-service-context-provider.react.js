// @flow

import * as React from 'react';

import { getOneTimeKeyArray } from 'lib/shared/crypto-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import {
  type IdentityKeysBlob,
  identityKeysBlobValidator,
} from 'lib/types/crypto-types.js';
import {
  type DeviceOlmOutboundKeys,
  deviceOlmOutboundKeysValidator,
  type IdentityServiceClient,
  ONE_TIME_KEYS_NUMBER,
  type UserDevicesOlmOutboundKeys,
  type UserLoginResponse,
} from 'lib/types/identity-service-types.js';
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
      getKeyserverKeys: async (
        keyserverID: string,
      ): Promise<DeviceOlmOutboundKeys> => {
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

        return assertWithValidator(
          keyserverKeys,
          deviceOlmOutboundKeysValidator,
        );
      },
      getOutboundKeysForUser: async (
        targetUserID: string,
      ): Promise<UserDevicesOlmOutboundKeys[]> => {
        const {
          deviceID: authDeviceID,
          userID,
          accessToken,
        } = await getAuthMetadata();
        const result = await commRustModule.getOutboundKeysForUser(
          userID,
          authDeviceID,
          accessToken,
          targetUserID,
        );
        const resultArray = JSON.parse(result);

        return resultArray
          .map(outboundKeysInfo => {
            try {
              const payload = outboundKeysInfo?.payload;
              const identityKeysBlob: IdentityKeysBlob = assertWithValidator(
                payload ? JSON.parse(payload) : null,
                identityKeysBlobValidator,
              );
              const deviceID =
                identityKeysBlob.primaryIdentityPublicKeys.ed25519;

              if (
                !outboundKeysInfo.oneTimeContentPrekey ||
                !outboundKeysInfo.oneTimeNotifPrekey
              ) {
                console.log(`Missing one time key for device ${deviceID}`);
                return {
                  deviceID,
                  keys: null,
                };
              }

              const deviceKeys = {
                identityKeysBlob,
                contentInitializationInfo: {
                  prekey: outboundKeysInfo?.contentPrekey,
                  prekeySignature: outboundKeysInfo?.contentPrekeySignature,
                  oneTimeKey: outboundKeysInfo?.oneTimeContentPrekey,
                },
                notifInitializationInfo: {
                  prekey: outboundKeysInfo?.notifPrekey,
                  prekeySignature: outboundKeysInfo?.notifPrekeySignature,
                  oneTimeKey: outboundKeysInfo?.oneTimeNotifPrekey,
                },
                payloadSignature: outboundKeysInfo?.payloadSignature,
                socialProof: outboundKeysInfo?.socialProof,
              };

              try {
                const validatedKeys = assertWithValidator(
                  deviceKeys,
                  deviceOlmOutboundKeysValidator,
                );
                return {
                  deviceID,
                  keys: validatedKeys,
                };
              } catch (e) {
                console.log(e);
                return {
                  deviceID,
                  keys: null,
                };
              }
            } catch (e) {
              console.log(e);
              return null;
            }
          })
          .filter(Boolean);
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
