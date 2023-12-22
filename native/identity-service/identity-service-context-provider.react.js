// @flow

import * as React from 'react';

import { getOneTimeKeyValues } from 'lib/shared/crypto-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import {
  type IdentityKeysBlob,
  identityKeysBlobValidator,
} from 'lib/types/crypto-types.js';
import {
  type DeviceOlmOutboundKeys,
  deviceOlmOutboundKeysValidator,
  type IdentityServiceClient,
  type UserDevicesOlmOutboundKeys,
  type UserLoginResponse,
} from 'lib/types/identity-service-types.js';
import {
  ONE_TIME_KEYS_NUMBER,
  identityAuthResultValidator,
} from 'lib/types/identity-service-types.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { getCommServicesAuthMetadataEmitter } from '../event-emitters/csa-auth-metadata-emitter.js';
import { commCoreModule, commRustModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

type Props = {
  +children: React.Node,
};
function IdentityServiceContextProvider(props: Props): React.Node {
  const { children } = props;

  const userIDPromiseRef = React.useRef<?Promise<?string>>();
  if (!userIDPromiseRef.current) {
    userIDPromiseRef.current = (async () => {
      const { userID } = await commCoreModule.getCommServicesAuthMetadata();
      return userID;
    })();
  }

  React.useEffect(() => {
    const metadataEmitter = getCommServicesAuthMetadataEmitter();
    const subscription = metadataEmitter.addListener(
      'commServicesAuthMetadata',
      (authMetadata: UserLoginResponse) => {
        userIDPromiseRef.current = Promise.resolve(authMetadata.userId);
      },
    );
    return () => subscription.remove();
  }, []);

  const accessToken = useSelector(state => state.commServicesAccessToken);

  const getAuthMetadata = React.useCallback<
    () => Promise<{
      +deviceID: string,
      +userID: string,
      +accessToken: string,
    }>,
  >(async () => {
    const deviceID = await getContentSigningKey();
    const userID = await userIDPromiseRef.current;
    if (!deviceID || !userID || !accessToken) {
      throw new Error('Identity service client is not initialized');
    }
    return { deviceID, userID, accessToken };
  }, [accessToken]);

  const client = React.useMemo<IdentityServiceClient>(
    () => ({
      deleteUser: async () => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return commRustModule.deleteUser(userID, deviceID, token);
      },
      getKeyserverKeys: async (
        keyserverID: string,
      ): Promise<DeviceOlmOutboundKeys> => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        const result = await commRustModule.getKeyserverKeys(
          userID,
          deviceID,
          token,
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
          accessToken: token,
        } = await getAuthMetadata();
        const result = await commRustModule.getOutboundKeysForUser(
          userID,
          authDeviceID,
          token,
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
          commCoreModule.validateAndGetPrekeys(),
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
          getOneTimeKeyValues(primaryOneTimeKeys),
          getOneTimeKeyValues(notificationsOneTimeKeys),
        );
        const { userID, accessToken: token } = JSON.parse(registrationResult);
        return { accessToken: token, userID, username };
      },
      logInPasswordUser: async (username: string, password: string) => {
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
          commCoreModule.validateAndGetPrekeys(),
        ]);
        const loginResult = await commRustModule.logInPasswordUser(
          username,
          password,
          blobPayload,
          signature,
          prekeys.contentPrekey,
          prekeys.contentPrekeySignature,
          prekeys.notifPrekey,
          prekeys.notifPrekeySignature,
          getOneTimeKeyValues(primaryOneTimeKeys),
          getOneTimeKeyValues(notificationsOneTimeKeys),
        );
        const { userID, accessToken: token } = JSON.parse(loginResult);
        const identityAuthResult = { accessToken: token, userID, username };

        return assertWithValidator(
          identityAuthResult,
          identityAuthResultValidator,
        );
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
