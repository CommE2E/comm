// @flow

import * as React from 'react';

import { getOneTimeKeyValues } from 'lib/shared/crypto-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import {
  type IdentityKeysBlob,
  identityKeysBlobValidator,
  type OneTimeKeysResultValues,
} from 'lib/types/crypto-types.js';
import {
  type DeviceOlmInboundKeys,
  deviceOlmInboundKeysValidator,
  type DeviceOlmOutboundKeys,
  deviceOlmOutboundKeysValidator,
  farcasterUsersValidator,
  identityAuthResultValidator,
  type IdentityServiceClient,
  ONE_TIME_KEYS_NUMBER,
  type SignedDeviceList,
  signedDeviceListHistoryValidator,
  type SignedNonce,
  type UserAuthMetadata,
  userDeviceOlmInboundKeysValidator,
  type UserDevicesOlmInboundKeys,
  type UserDevicesOlmOutboundKeys,
  type UsersSignedDeviceLists,
  usersSignedDeviceListsValidator,
} from 'lib/types/identity-service-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { getCommServicesAuthMetadataEmitter } from '../event-emitters/csa-auth-metadata-emitter.js';
import { commCoreModule, commRustModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

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
      (authMetadata: UserAuthMetadata) => {
        userIDPromiseRef.current = Promise.resolve(authMetadata.userID);
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
      deleteWalletUser: async () => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return commRustModule.deleteWalletUser(userID, deviceID, token);
      },
      deletePasswordUser: async (password: string) => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return commRustModule.deletePasswordUser(
          userID,
          deviceID,
          token,
          password,
        );
      },
      logOut: async () => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return commRustModule.logOut(userID, deviceID, token);
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
      getInboundKeysForUser: async (
        targetUserID: string,
      ): Promise<UserDevicesOlmInboundKeys> => {
        const {
          deviceID: authDeviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        const result = await commRustModule.getInboundKeysForUser(
          userID,
          authDeviceID,
          token,
          targetUserID,
        );
        const resultArray = JSON.parse(result);

        const devicesKeys: {
          [deviceID: string]: ?DeviceOlmInboundKeys,
        } = {};

        resultArray.forEach(inboundKeysInfo => {
          try {
            const payload = inboundKeysInfo?.payload;
            const identityKeysBlob: IdentityKeysBlob = assertWithValidator(
              payload ? JSON.parse(payload) : null,
              identityKeysBlobValidator,
            );
            const deviceID = identityKeysBlob.primaryIdentityPublicKeys.ed25519;

            const deviceKeys = {
              identityKeysBlob,
              signedPrekeys: {
                contentPrekey: inboundKeysInfo?.contentPrekey,
                contentPrekeySignature: inboundKeysInfo?.contentPrekeySignature,
                notifPrekey: inboundKeysInfo?.notifPrekey,
                notifPrekeySignature: inboundKeysInfo?.notifPrekeySignature,
              },
              payloadSignature: inboundKeysInfo?.payloadSignature,
            };

            try {
              devicesKeys[deviceID] = assertWithValidator(
                deviceKeys,
                deviceOlmInboundKeysValidator,
              );
            } catch (e) {
              console.log(e);
              devicesKeys[deviceID] = null;
            }
          } catch (e) {
            console.log(e);
          }
        });
        const device = resultArray?.[0];

        const inboundUserKeys = {
          keys: devicesKeys,
          username: device?.username,
          walletAddress: device?.walletAddress,
        };

        return assertWithValidator(
          inboundUserKeys,
          userDeviceOlmInboundKeysValidator,
        );
      },
      uploadOneTimeKeys: async (oneTimeKeys: OneTimeKeysResultValues) => {
        const {
          deviceID: authDeviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();

        await commRustModule.uploadOneTimeKeys(
          userID,
          authDeviceID,
          token,
          oneTimeKeys.contentOneTimeKeys,
          oneTimeKeys.notificationsOneTimeKeys,
        );
      },
      registerPasswordUser: async (
        username: string,
        password: string,
        fid: ?string,
      ) => {
        await commCoreModule.initializeCryptoAccount();
        const [
          { blobPayload, signature, primaryIdentityPublicKeys },
          { contentOneTimeKeys, notificationsOneTimeKeys },
          prekeys,
        ] = await Promise.all([
          commCoreModule.getUserPublicKey(),
          commCoreModule.getOneTimeKeys(ONE_TIME_KEYS_NUMBER),
          commCoreModule.validateAndGetPrekeys(),
        ]);
        const registrationResult = await commRustModule.registerPasswordUser(
          username,
          password,
          blobPayload,
          signature,
          prekeys.contentPrekey,
          prekeys.contentPrekeySignature,
          prekeys.notifPrekey,
          prekeys.notifPrekeySignature,
          getOneTimeKeyValues(contentOneTimeKeys),
          getOneTimeKeyValues(notificationsOneTimeKeys),
          fid ?? '',
        );
        const { userID, accessToken: token } = JSON.parse(registrationResult);
        const identityAuthResult = { accessToken: token, userID, username };

        const validatedResult = assertWithValidator(
          identityAuthResult,
          identityAuthResultValidator,
        );

        await commCoreModule.setCommServicesAuthMetadata(
          validatedResult.userID,
          primaryIdentityPublicKeys.ed25519,
          validatedResult.accessToken,
        );

        return validatedResult;
      },
      registerReservedPasswordUser: async (
        username: string,
        password: string,
        keyserverMessage: string,
        keyserverSignature: string,
      ) => {
        await commCoreModule.initializeCryptoAccount();
        const [
          { blobPayload, signature, primaryIdentityPublicKeys },
          { contentOneTimeKeys, notificationsOneTimeKeys },
          prekeys,
        ] = await Promise.all([
          commCoreModule.getUserPublicKey(),
          commCoreModule.getOneTimeKeys(ONE_TIME_KEYS_NUMBER),
          commCoreModule.validateAndGetPrekeys(),
        ]);
        const registrationResult =
          await commRustModule.registerReservedPasswordUser(
            username,
            password,
            blobPayload,
            signature,
            prekeys.contentPrekey,
            prekeys.contentPrekeySignature,
            prekeys.notifPrekey,
            prekeys.notifPrekeySignature,
            getOneTimeKeyValues(contentOneTimeKeys),
            getOneTimeKeyValues(notificationsOneTimeKeys),
            keyserverMessage,
            keyserverSignature,
          );
        const { userID, accessToken: token } = JSON.parse(registrationResult);
        const identityAuthResult = { accessToken: token, userID, username };

        const validatedResult = assertWithValidator(
          identityAuthResult,
          identityAuthResultValidator,
        );

        await commCoreModule.setCommServicesAuthMetadata(
          validatedResult.userID,
          primaryIdentityPublicKeys.ed25519,
          validatedResult.accessToken,
        );

        return validatedResult;
      },
      logInPasswordUser: async (username: string, password: string) => {
        await commCoreModule.initializeCryptoAccount();
        const [{ blobPayload, signature, primaryIdentityPublicKeys }, prekeys] =
          await Promise.all([
            commCoreModule.getUserPublicKey(),
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
        );
        const { userID, accessToken: token } = JSON.parse(loginResult);
        const identityAuthResult = { accessToken: token, userID, username };

        const validatedResult = assertWithValidator(
          identityAuthResult,
          identityAuthResultValidator,
        );

        await commCoreModule.setCommServicesAuthMetadata(
          validatedResult.userID,
          primaryIdentityPublicKeys.ed25519,
          validatedResult.accessToken,
        );

        return validatedResult;
      },
      registerWalletUser: async (
        walletAddress: string,
        siweMessage: string,
        siweSignature: string,
        fid: ?string,
      ) => {
        await commCoreModule.initializeCryptoAccount();
        const [
          { blobPayload, signature, primaryIdentityPublicKeys },
          { contentOneTimeKeys, notificationsOneTimeKeys },
          prekeys,
        ] = await Promise.all([
          commCoreModule.getUserPublicKey(),
          commCoreModule.getOneTimeKeys(ONE_TIME_KEYS_NUMBER),
          commCoreModule.validateAndGetPrekeys(),
        ]);
        const registrationResult = await commRustModule.registerWalletUser(
          siweMessage,
          siweSignature,
          blobPayload,
          signature,
          prekeys.contentPrekey,
          prekeys.contentPrekeySignature,
          prekeys.notifPrekey,
          prekeys.notifPrekeySignature,
          getOneTimeKeyValues(contentOneTimeKeys),
          getOneTimeKeyValues(notificationsOneTimeKeys),
          fid ?? '',
        );
        const { userID, accessToken: token } = JSON.parse(registrationResult);
        const identityAuthResult = {
          accessToken: token,
          userID,
          username: walletAddress,
        };

        const validatedResult = assertWithValidator(
          identityAuthResult,
          identityAuthResultValidator,
        );

        await commCoreModule.setCommServicesAuthMetadata(
          validatedResult.userID,
          primaryIdentityPublicKeys.ed25519,
          validatedResult.accessToken,
        );

        return validatedResult;
      },
      registerReservedWalletUser: async (
        walletAddress: string,
        siweMessage: string,
        siweSignature: string,
        keyserverMessage: string,
        keyserverSignature: string,
      ) => {
        await commCoreModule.initializeCryptoAccount();
        const [
          { blobPayload, signature, primaryIdentityPublicKeys },
          { contentOneTimeKeys, notificationsOneTimeKeys },
          prekeys,
        ] = await Promise.all([
          commCoreModule.getUserPublicKey(),
          commCoreModule.getOneTimeKeys(ONE_TIME_KEYS_NUMBER),
          commCoreModule.validateAndGetPrekeys(),
        ]);
        const registrationResult =
          await commRustModule.registerReservedWalletUser(
            siweMessage,
            siweSignature,
            blobPayload,
            signature,
            prekeys.contentPrekey,
            prekeys.contentPrekeySignature,
            prekeys.notifPrekey,
            prekeys.notifPrekeySignature,
            getOneTimeKeyValues(contentOneTimeKeys),
            getOneTimeKeyValues(notificationsOneTimeKeys),
            keyserverMessage,
            keyserverSignature,
          );
        const { userID, accessToken: token } = JSON.parse(registrationResult);
        const identityAuthResult = {
          accessToken: token,
          userID,
          username: walletAddress,
        };

        const validatedResult = assertWithValidator(
          identityAuthResult,
          identityAuthResultValidator,
        );

        await commCoreModule.setCommServicesAuthMetadata(
          validatedResult.userID,
          primaryIdentityPublicKeys.ed25519,
          validatedResult.accessToken,
        );

        return validatedResult;
      },
      logInWalletUser: async (
        walletAddress: string,
        siweMessage: string,
        siweSignature: string,
      ) => {
        await commCoreModule.initializeCryptoAccount();
        const [{ blobPayload, signature, primaryIdentityPublicKeys }, prekeys] =
          await Promise.all([
            commCoreModule.getUserPublicKey(),
            commCoreModule.validateAndGetPrekeys(),
          ]);
        const loginResult = await commRustModule.logInWalletUser(
          siweMessage,
          siweSignature,
          blobPayload,
          signature,
          prekeys.contentPrekey,
          prekeys.contentPrekeySignature,
          prekeys.notifPrekey,
          prekeys.notifPrekeySignature,
        );
        const { userID, accessToken: token } = JSON.parse(loginResult);
        const identityAuthResult = {
          accessToken: token,
          userID,
          username: walletAddress,
        };

        const validatedResult = assertWithValidator(
          identityAuthResult,
          identityAuthResultValidator,
        );

        await commCoreModule.setCommServicesAuthMetadata(
          validatedResult.userID,
          primaryIdentityPublicKeys.ed25519,
          validatedResult.accessToken,
        );

        return validatedResult;
      },
      uploadKeysForRegisteredDeviceAndLogIn: async (
        userID: string,
        nonceChallengeResponse: SignedNonce,
      ) => {
        await commCoreModule.initializeCryptoAccount();
        const [
          { blobPayload, signature, primaryIdentityPublicKeys },
          { contentOneTimeKeys, notificationsOneTimeKeys },
          prekeys,
        ] = await Promise.all([
          commCoreModule.getUserPublicKey(),
          commCoreModule.getOneTimeKeys(ONE_TIME_KEYS_NUMBER),
          commCoreModule.validateAndGetPrekeys(),
        ]);
        const { nonce, nonceSignature } = nonceChallengeResponse;
        const registrationResult =
          await commRustModule.uploadSecondaryDeviceKeysAndLogIn(
            userID,
            nonce,
            nonceSignature,
            blobPayload,
            signature,
            prekeys.contentPrekey,
            prekeys.contentPrekeySignature,
            prekeys.notifPrekey,
            prekeys.notifPrekeySignature,
            getOneTimeKeyValues(contentOneTimeKeys),
            getOneTimeKeyValues(notificationsOneTimeKeys),
          );
        const { accessToken: token } = JSON.parse(registrationResult);

        const identityAuthResult = { accessToken: token, userID, username: '' };
        const validatedResult = assertWithValidator(
          identityAuthResult,
          identityAuthResultValidator,
        );

        await commCoreModule.setCommServicesAuthMetadata(
          validatedResult.userID,
          primaryIdentityPublicKeys.ed25519,
          validatedResult.accessToken,
        );

        return validatedResult;
      },
      generateNonce: commRustModule.generateNonce,
      getDeviceListHistoryForUser: async (
        userID: string,
        sinceTimestamp?: number,
      ) => {
        const {
          deviceID: authDeviceID,
          userID: authUserID,
          accessToken: token,
        } = await getAuthMetadata();
        const result = await commRustModule.getDeviceListForUser(
          authUserID,
          authDeviceID,
          token,
          userID,
          sinceTimestamp,
        );
        const rawPayloads: string[] = JSON.parse(result);
        const deviceLists: SignedDeviceList[] = rawPayloads.map(payload =>
          JSON.parse(payload),
        );
        return assertWithValidator(
          deviceLists,
          signedDeviceListHistoryValidator,
        );
      },
      getDeviceListsForUsers: async (userIDs: $ReadOnlyArray<string>) => {
        const {
          deviceID: authDeviceID,
          userID: authUserID,
          accessToken: token,
        } = await getAuthMetadata();
        const result = await commRustModule.getDeviceListsForUsers(
          authUserID,
          authDeviceID,
          token,
          userIDs,
        );
        const rawPayloads: { +[userID: string]: string } = JSON.parse(result);

        let usersDeviceLists: UsersSignedDeviceLists = {};
        for (const userID in rawPayloads) {
          usersDeviceLists = {
            ...usersDeviceLists,
            [userID]: JSON.parse(rawPayloads[userID]),
          };
        }

        return assertWithValidator(
          usersDeviceLists,
          usersSignedDeviceListsValidator,
        );
      },
      updateDeviceList: async (newDeviceList: SignedDeviceList) => {
        const {
          deviceID: authDeviceID,
          userID,
          accessToken: authAccessToken,
        } = await getAuthMetadata();
        const payload = JSON.stringify(newDeviceList);
        await commRustModule.updateDeviceList(
          userID,
          authDeviceID,
          authAccessToken,
          payload,
        );
      },
      getFarcasterUsers: async (farcasterIDs: $ReadOnlyArray<string>) => {
        const farcasterUsersJSONString =
          await commRustModule.getFarcasterUsers(farcasterIDs);
        const farcasterUsers = JSON.parse(farcasterUsersJSONString);
        return assertWithValidator(farcasterUsers, farcasterUsersValidator);
      },
      linkFarcasterAccount: async (farcasterID: string) => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return commRustModule.linkFarcasterAccount(
          userID,
          deviceID,
          token,
          farcasterID,
        );
      },
      unlinkFarcasterAccount: async () => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return commRustModule.unlinkFarcasterAccount(userID, deviceID, token);
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
