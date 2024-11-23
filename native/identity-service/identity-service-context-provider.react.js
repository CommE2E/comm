// @flow

import * as React from 'react';

import { useInvalidCSATLogOut } from 'lib/actions/user-actions.js';
import { getOneTimeKeyValues } from 'lib/shared/crypto-utils.js';
import { createAndSignSingletonDeviceList } from 'lib/shared/device-list-utils.js';
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
  userIdentitiesResponseValidator,
  type UsersDevicesPlatformDetails,
  peersDeviceListsValidator,
} from 'lib/types/identity-service-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
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

  const processAuthResult = async (authResult: string, deviceID: string) => {
    const { userID, accessToken: token, username } = JSON.parse(authResult);
    const identityAuthResult = {
      accessToken: token,
      userID,
      username,
    };

    const validatedResult = assertWithValidator(
      identityAuthResult,
      identityAuthResultValidator,
    );

    await commCoreModule.setCommServicesAuthMetadata(
      validatedResult.userID,
      deviceID,
      validatedResult.accessToken,
    );

    return validatedResult;
  };

  const invalidTokenLogOut = useInvalidCSATLogOut();
  const authVerifiedEndpoint: <T>(
    identityRPCPromise: Promise<T>,
  ) => Promise<T> = React.useCallback(
    async identityRPCPromise => {
      try {
        const result = await identityRPCPromise;
        return result;
      } catch (e) {
        const message = getMessageForException(e);
        if (message === 'bad_credentials') {
          void invalidTokenLogOut();
        }
        throw e;
      }
    },
    [invalidTokenLogOut],
  );

  const client = React.useMemo<IdentityServiceClient>(
    () => ({
      deleteWalletUser: async () => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return authVerifiedEndpoint(
          commRustModule.deleteWalletUser(userID, deviceID, token),
        );
      },
      deletePasswordUser: async (password: string) => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return authVerifiedEndpoint(
          commRustModule.deletePasswordUser(userID, deviceID, token, password),
        );
      },
      logOut: async () => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return authVerifiedEndpoint(
          commRustModule.logOut(userID, deviceID, token),
        );
      },
      logOutPrimaryDevice: async () => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        const signedDeviceList =
          await createAndSignSingletonDeviceList(deviceID);
        return authVerifiedEndpoint(
          commRustModule.logOutPrimaryDevice(
            userID,
            deviceID,
            token,
            JSON.stringify(signedDeviceList),
          ),
        );
      },
      logOutSecondaryDevice: async () => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return authVerifiedEndpoint(
          commRustModule.logOutSecondaryDevice(userID, deviceID, token),
        );
      },
      getKeyserverKeys: async (
        keyserverID: string,
      ): Promise<DeviceOlmOutboundKeys> => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        const result = await authVerifiedEndpoint(
          commRustModule.getKeyserverKeys(userID, deviceID, token, keyserverID),
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
        const result = await authVerifiedEndpoint(
          commRustModule.getOutboundKeysForUser(
            userID,
            authDeviceID,
            token,
            targetUserID,
          ),
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
        const result = await authVerifiedEndpoint(
          commRustModule.getInboundKeysForUser(
            userID,
            authDeviceID,
            token,
            targetUserID,
          ),
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

        await authVerifiedEndpoint(
          commRustModule.uploadOneTimeKeys(
            userID,
            authDeviceID,
            token,
            oneTimeKeys.contentOneTimeKeys,
            oneTimeKeys.notificationsOneTimeKeys,
          ),
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
        const initialDeviceList = await createAndSignSingletonDeviceList(
          primaryIdentityPublicKeys.ed25519,
        );
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
          JSON.stringify(initialDeviceList),
        );

        return await processAuthResult(
          registrationResult,
          primaryIdentityPublicKeys.ed25519,
        );
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
        const initialDeviceList = await createAndSignSingletonDeviceList(
          primaryIdentityPublicKeys.ed25519,
        );
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
            JSON.stringify(initialDeviceList),
          );

        return await processAuthResult(
          registrationResult,
          primaryIdentityPublicKeys.ed25519,
        );
      },
      logInPasswordUser: async (username: string, password: string) => {
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
        const loginResult = await commRustModule.logInPasswordUser(
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
        );

        return await processAuthResult(
          loginResult,
          primaryIdentityPublicKeys.ed25519,
        );
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
        const initialDeviceList = await createAndSignSingletonDeviceList(
          primaryIdentityPublicKeys.ed25519,
        );
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
          JSON.stringify(initialDeviceList),
        );

        return await processAuthResult(
          registrationResult,
          primaryIdentityPublicKeys.ed25519,
        );
      },
      logInWalletUser: async (
        walletAddress: string,
        siweMessage: string,
        siweSignature: string,
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
        const loginResult = await commRustModule.logInWalletUser(
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
        );

        return await processAuthResult(
          loginResult,
          primaryIdentityPublicKeys.ed25519,
        );
      },
      restoreUser: async (
        userID: string,
        deviceList: SignedDeviceList,
        siweMessage?: string,
        siweSignature?: string,
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
        const restoreResult = await commRustModule.restoreUser(
          userID,
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
          JSON.stringify(deviceList),
        );

        return await processAuthResult(
          restoreResult,
          primaryIdentityPublicKeys.ed25519,
        );
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

        return await processAuthResult(
          registrationResult,
          primaryIdentityPublicKeys.ed25519,
        );
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
        const result = await authVerifiedEndpoint(
          commRustModule.getDeviceListForUser(
            authUserID,
            authDeviceID,
            token,
            userID,
            sinceTimestamp,
          ),
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
        const result = await authVerifiedEndpoint(
          commRustModule.getDeviceListsForUsers(
            authUserID,
            authDeviceID,
            token,
            userIDs,
          ),
        );

        const rawPayloads: {
          +usersDeviceLists: { +[userID: string]: string },
          +usersDevicesPlatformDetails: UsersDevicesPlatformDetails,
        } = JSON.parse(result);

        let usersDeviceLists: UsersSignedDeviceLists = {};
        for (const userID in rawPayloads.usersDeviceLists) {
          usersDeviceLists = {
            ...usersDeviceLists,
            [userID]: JSON.parse(rawPayloads.usersDeviceLists[userID]),
          };
        }

        const peersDeviceLists = {
          usersSignedDeviceLists: usersDeviceLists,
          usersDevicesPlatformDetails: rawPayloads.usersDevicesPlatformDetails,
        };

        return assertWithValidator(peersDeviceLists, peersDeviceListsValidator);
      },
      updateDeviceList: async (newDeviceList: SignedDeviceList) => {
        const {
          deviceID: authDeviceID,
          userID,
          accessToken: authAccessToken,
        } = await getAuthMetadata();
        const payload = JSON.stringify(newDeviceList);
        await authVerifiedEndpoint(
          commRustModule.updateDeviceList(
            userID,
            authDeviceID,
            authAccessToken,
            payload,
          ),
        );
      },
      syncPlatformDetails: async () => {
        const {
          deviceID: authDeviceID,
          userID,
          accessToken: authAccessToken,
        } = await getAuthMetadata();
        await authVerifiedEndpoint(
          commRustModule.syncPlatformDetails(
            userID,
            authDeviceID,
            authAccessToken,
          ),
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
        return authVerifiedEndpoint(
          commRustModule.linkFarcasterAccount(
            userID,
            deviceID,
            token,
            farcasterID,
          ),
        );
      },
      unlinkFarcasterAccount: async () => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return authVerifiedEndpoint(
          commRustModule.unlinkFarcasterAccount(userID, deviceID, token),
        );
      },
      findUserIdentities: async (userIDs: $ReadOnlyArray<string>) => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        const result = await authVerifiedEndpoint(
          commRustModule.findUserIdentities(userID, deviceID, token, userIDs),
        );
        return assertWithValidator(
          JSON.parse(result),
          userIdentitiesResponseValidator,
        );
      },
      versionSupported: () => {
        return commRustModule.versionSupported();
      },
      changePassword: async (oldPassword: string, newPassword: string) => {
        const {
          deviceID,
          userID,
          accessToken: token,
        } = await getAuthMetadata();
        return authVerifiedEndpoint(
          commRustModule.updatePassword(
            userID,
            deviceID,
            token,
            oldPassword,
            newPassword,
          ),
        );
      },
    }),
    [getAuthMetadata, authVerifiedEndpoint],
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
