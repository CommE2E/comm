// @flow

import { Login, Registration } from '@commapp/opaque-ke-wasm';

import identityServiceConfig from 'lib/facts/identity-service.js';
import type {
  OneTimeKeysResultValues,
  SignedPrekeys,
} from 'lib/types/crypto-types.js';
import type { PlatformDetails } from 'lib/types/device-types.js';
import {
  type SignedDeviceList,
  signedDeviceListHistoryValidator,
  type SignedNonce,
  type IdentityServiceAuthLayer,
  type IdentityServiceClient,
  type DeviceOlmOutboundKeys,
  deviceOlmOutboundKeysValidator,
  type UserDevicesOlmOutboundKeys,
  type IdentityAuthResult,
  type IdentityNewDeviceKeyUpload,
  identityAuthResultValidator,
  type UserDevicesOlmInboundKeys,
  type DeviceOlmInboundKeys,
  deviceOlmInboundKeysValidator,
  userDeviceOlmInboundKeysValidator,
  type FarcasterUser,
  farcasterUsersValidator,
  type UsersSignedDeviceLists,
  type Identities,
  type UserIdentitiesResponse,
  userIdentitiesResponseValidator,
  type PeersDeviceLists,
  peersDeviceListsValidator,
  type IdentityPlatformDetails,
  platformToIdentityDeviceType,
} from 'lib/types/identity-service-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { VersionInterceptor, AuthInterceptor } from './interceptor.js';
import * as IdentityAuthClient from '../protobufs/identity-auth-client.cjs';
import * as IdentityAuthStructs from '../protobufs/identity-auth-structs.cjs';
import * as identityUnauthStructs from '../protobufs/identity-unauth-structs.cjs';
import {
  DeviceKeyUpload,
  Empty,
  IdentityKeyInfo,
  OpaqueLoginFinishRequest,
  OpaqueLoginStartRequest,
  Prekey,
  WalletAuthRequest,
  SecondaryDeviceKeysUploadRequest,
  GetFarcasterUsersRequest,
} from '../protobufs/identity-unauth-structs.cjs';
import * as IdentityUnauthClient from '../protobufs/identity-unauth.cjs';
import { initOpaque } from '../shared-worker/utils/opaque-utils.js';

class IdentityServiceClientWrapper implements IdentityServiceClient {
  overridedOpaqueFilepath: string;
  platformDetails: PlatformDetails;
  authClient: ?IdentityAuthClient.IdentityClientServicePromiseClient;
  unauthClient: IdentityUnauthClient.IdentityClientServicePromiseClient;
  getNewDeviceKeyUpload: () => Promise<IdentityNewDeviceKeyUpload>;

  constructor(
    platformDetails: PlatformDetails,
    overridedOpaqueFilepath: string,
    authLayer: ?IdentityServiceAuthLayer,
    getNewDeviceKeyUpload: () => Promise<IdentityNewDeviceKeyUpload>,
  ) {
    this.overridedOpaqueFilepath = overridedOpaqueFilepath;
    this.platformDetails = platformDetails;
    if (authLayer) {
      this.authClient = IdentityServiceClientWrapper.createAuthClient(
        platformDetails,
        authLayer,
      );
    }
    this.unauthClient =
      IdentityServiceClientWrapper.createUnauthClient(platformDetails);
    this.getNewDeviceKeyUpload = getNewDeviceKeyUpload;
  }

  static determineSocketAddr(): string {
    return process.env.IDENTITY_SOCKET_ADDR ?? identityServiceConfig.defaultURL;
  }

  static createAuthClient(
    platformDetails: PlatformDetails,
    authLayer: IdentityServiceAuthLayer,
  ): IdentityAuthClient.IdentityClientServicePromiseClient {
    const { userID, deviceID, commServicesAccessToken } = authLayer;

    const identitySocketAddr =
      IdentityServiceClientWrapper.determineSocketAddr();

    const versionInterceptor = new VersionInterceptor<Request, Response>(
      platformDetails,
    );
    const authInterceptor = new AuthInterceptor<Request, Response>(
      userID,
      deviceID,
      commServicesAccessToken,
    );

    const authClientOpts = {
      unaryInterceptors: [versionInterceptor, authInterceptor],
    };

    return new IdentityAuthClient.IdentityClientServicePromiseClient(
      identitySocketAddr,
      null,
      authClientOpts,
    );
  }

  static createUnauthClient(
    platformDetails: PlatformDetails,
  ): IdentityUnauthClient.IdentityClientServicePromiseClient {
    const identitySocketAddr =
      IdentityServiceClientWrapper.determineSocketAddr();

    const versionInterceptor = new VersionInterceptor<Request, Response>(
      platformDetails,
    );

    const unauthClientOpts = {
      unaryInterceptors: [versionInterceptor],
    };

    return new IdentityUnauthClient.IdentityClientServicePromiseClient(
      identitySocketAddr,
      null,
      unauthClientOpts,
    );
  }

  logOut: () => Promise<void> = async () => {
    if (!this.authClient) {
      throw new Error('Identity service client is not initialized');
    }
    await this.authClient.logOutUser(new Empty());
  };

  logOutSecondaryDevice: () => Promise<void> = async () => {
    if (!this.authClient) {
      throw new Error('Identity service client is not initialized');
    }
    await this.authClient.logOutSecondaryDevice(new Empty());
  };

  getKeyserverKeys: (keyserverID: string) => Promise<DeviceOlmOutboundKeys> =
    async (keyserverID: string) => {
      const client = this.authClient;
      if (!client) {
        throw new Error('Identity service client is not initialized');
      }

      const request = new IdentityAuthStructs.OutboundKeysForUserRequest();
      request.setUserId(keyserverID);
      const response = await client.getKeyserverKeys(request);

      const keyserverInfo = response.getKeyserverInfo();
      const identityInfo = keyserverInfo?.getIdentityInfo();
      const contentPreKey = keyserverInfo?.getContentPrekey();
      const notifPreKey = keyserverInfo?.getNotifPrekey();
      const payload = identityInfo?.getPayload();

      const keyserverKeys = {
        identityKeysBlob: payload ? JSON.parse(payload) : null,
        contentInitializationInfo: {
          prekey: contentPreKey?.getPrekey(),
          prekeySignature: contentPreKey?.getPrekeySignature(),
          oneTimeKey: keyserverInfo?.getOneTimeContentPrekey(),
        },
        notifInitializationInfo: {
          prekey: notifPreKey?.getPrekey(),
          prekeySignature: notifPreKey?.getPrekeySignature(),
          oneTimeKey: keyserverInfo?.getOneTimeNotifPrekey(),
        },
        payloadSignature: identityInfo?.getPayloadSignature(),
      };

      return assertWithValidator(keyserverKeys, deviceOlmOutboundKeysValidator);
    };

  getOutboundKeysForUser: (
    userID: string,
  ) => Promise<UserDevicesOlmOutboundKeys[]> = async (userID: string) => {
    const client = this.authClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }

    const request = new IdentityAuthStructs.OutboundKeysForUserRequest();
    request.setUserId(userID);
    const response = await client.getOutboundKeysForUser(request);
    const devicesMap = response.toObject()?.devicesMap;

    if (!devicesMap || !Array.isArray(devicesMap)) {
      throw new Error('Invalid devicesMap');
    }

    const devicesKeys: (?UserDevicesOlmOutboundKeys)[] = devicesMap.map(
      ([deviceID, outboundKeysInfo]) => {
        const identityInfo = outboundKeysInfo?.identityInfo;
        const payload = identityInfo?.payload;
        const contentPreKey = outboundKeysInfo?.contentPrekey;
        const notifPreKey = outboundKeysInfo?.notifPrekey;

        if (typeof deviceID !== 'string') {
          console.log(`Invalid deviceID in devicesMap: ${deviceID}`);
          return null;
        }

        const deviceKeys = {
          identityKeysBlob: payload ? JSON.parse(payload) : null,
          contentInitializationInfo: {
            prekey: contentPreKey?.prekey,
            prekeySignature: contentPreKey?.prekeySignature,
            oneTimeKey: outboundKeysInfo.oneTimeContentPrekey,
          },
          notifInitializationInfo: {
            prekey: notifPreKey?.prekey,
            prekeySignature: notifPreKey?.prekeySignature,
            oneTimeKey: outboundKeysInfo.oneTimeNotifPrekey,
          },
          payloadSignature: identityInfo?.payloadSignature,
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
      },
    );

    return devicesKeys.filter(Boolean);
  };

  getInboundKeysForUser: (
    userID: string,
  ) => Promise<UserDevicesOlmInboundKeys> = async (userID: string) => {
    const client = this.authClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }

    const request = new IdentityAuthStructs.InboundKeysForUserRequest();
    request.setUserId(userID);
    const response = await client.getInboundKeysForUser(request);
    const devicesMap = response.toObject()?.devicesMap;

    if (!devicesMap || !Array.isArray(devicesMap)) {
      throw new Error('Invalid devicesMap');
    }

    const devicesKeys: {
      [deviceID: string]: ?DeviceOlmInboundKeys,
    } = {};

    devicesMap.forEach(([deviceID, inboundKeys]) => {
      const identityInfo = inboundKeys?.identityInfo;
      const payload = identityInfo?.payload;
      const contentPreKey = inboundKeys?.contentPrekey;
      const notifPreKey = inboundKeys?.notifPrekey;

      if (typeof deviceID !== 'string') {
        console.log(`Invalid deviceID in devicesMap: ${deviceID}`);
        return;
      }

      const deviceKeys = {
        identityKeysBlob: payload ? JSON.parse(payload) : null,
        signedPrekeys: {
          contentPrekey: contentPreKey?.prekey,
          contentPrekeySignature: contentPreKey?.prekeySignature,
          notifPrekey: notifPreKey?.prekey,
          notifPrekeySignature: notifPreKey?.prekeySignature,
        },
        payloadSignature: identityInfo?.payloadSignature,
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
    });

    const identityInfo = response?.getIdentity();
    const inboundUserKeys = {
      keys: devicesKeys,
      username: identityInfo?.getUsername(),
      walletAddress: identityInfo?.getEthIdentity()?.getWalletAddress(),
    };

    return assertWithValidator(
      inboundUserKeys,
      userDeviceOlmInboundKeysValidator,
    );
  };

  uploadOneTimeKeys: (oneTimeKeys: OneTimeKeysResultValues) => Promise<void> =
    async (oneTimeKeys: OneTimeKeysResultValues) => {
      const client = this.authClient;
      if (!client) {
        throw new Error('Identity service client is not initialized');
      }

      const contentOneTimeKeysArray = [...oneTimeKeys.contentOneTimeKeys];
      const notifOneTimeKeysArray = [...oneTimeKeys.notificationsOneTimeKeys];

      const request = new IdentityAuthStructs.UploadOneTimeKeysRequest();
      request.setContentOneTimePrekeysList(contentOneTimeKeysArray);
      request.setNotifOneTimePrekeysList(notifOneTimeKeysArray);
      await client.uploadOneTimeKeys(request);
    };

  logInPasswordUser: (
    username: string,
    password: string,
  ) => Promise<IdentityAuthResult> = async (
    username: string,
    password: string,
  ) => {
    const client = this.unauthClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }

    const [identityDeviceKeyUpload] = await Promise.all([
      this.getNewDeviceKeyUpload(),
      initOpaque(this.overridedOpaqueFilepath),
    ]);

    const opaqueLogin = new Login();
    const startRequestBytes = opaqueLogin.start(password);

    const deviceKeyUpload = authNewDeviceKeyUpload(
      this.platformDetails,
      identityDeviceKeyUpload,
    );

    const loginStartRequest = new OpaqueLoginStartRequest();
    loginStartRequest.setUsername(username);
    loginStartRequest.setOpaqueLoginRequest(startRequestBytes);
    loginStartRequest.setDeviceKeyUpload(deviceKeyUpload);

    let loginStartResponse;
    try {
      loginStartResponse =
        await client.logInPasswordUserStart(loginStartRequest);
    } catch (e) {
      console.log(
        'Error calling logInPasswordUserStart:',
        getMessageForException(e) ?? 'unknown',
      );
      throw e;
    }
    const finishRequestBytes = opaqueLogin.finish(
      loginStartResponse.getOpaqueLoginResponse_asU8(),
    );

    const loginFinishRequest = new OpaqueLoginFinishRequest();
    loginFinishRequest.setSessionId(loginStartResponse.getSessionId());
    loginFinishRequest.setOpaqueLoginUpload(finishRequestBytes);

    let loginFinishResponse;
    try {
      loginFinishResponse =
        await client.logInPasswordUserFinish(loginFinishRequest);
    } catch (e) {
      console.log(
        'Error calling logInPasswordUserFinish:',
        getMessageForException(e) ?? 'unknown',
      );
      throw e;
    }

    const userID = loginFinishResponse.getUserId();
    const accessToken = loginFinishResponse.getAccessToken();
    const usernameResponse = loginFinishResponse.getUsername();
    const identityAuthResult = {
      accessToken,
      userID,
      username: usernameResponse,
    };

    return assertWithValidator(identityAuthResult, identityAuthResultValidator);
  };

  logInWalletUser: (
    walletAddress: string,
    siweMessage: string,
    siweSignature: string,
  ) => Promise<IdentityAuthResult> = async (
    walletAddress: string,
    siweMessage: string,
    siweSignature: string,
  ) => {
    const identityDeviceKeyUpload = await this.getNewDeviceKeyUpload();
    const deviceKeyUpload = authNewDeviceKeyUpload(
      this.platformDetails,
      identityDeviceKeyUpload,
    );

    const loginRequest = new WalletAuthRequest();
    loginRequest.setSiweMessage(siweMessage);
    loginRequest.setSiweSignature(siweSignature);
    loginRequest.setDeviceKeyUpload(deviceKeyUpload);

    let loginResponse;
    try {
      loginResponse = await this.unauthClient.logInWalletUser(loginRequest);
    } catch (e) {
      console.log(
        'Error calling logInWalletUser:',
        getMessageForException(e) ?? 'unknown',
      );
      throw e;
    }

    const userID = loginResponse.getUserId();
    const accessToken = loginResponse.getAccessToken();
    const username = loginResponse.getUsername();
    const identityAuthResult = { accessToken, userID, username };

    return assertWithValidator(identityAuthResult, identityAuthResultValidator);
  };

  uploadKeysForRegisteredDeviceAndLogIn: (
    ownerUserID: string,
    nonceChallengeResponse: SignedNonce,
  ) => Promise<IdentityAuthResult> = async (
    ownerUserID,
    nonceChallengeResponse,
  ) => {
    const identityDeviceKeyUpload = await this.getNewDeviceKeyUpload();
    const deviceKeyUpload = authNewDeviceKeyUpload(
      this.platformDetails,
      identityDeviceKeyUpload,
    );
    const { nonce, nonceSignature } = nonceChallengeResponse;

    const request = new SecondaryDeviceKeysUploadRequest();
    request.setUserId(ownerUserID);
    request.setNonce(nonce);
    request.setNonceSignature(nonceSignature);
    request.setDeviceKeyUpload(deviceKeyUpload);

    let response;
    try {
      response =
        await this.unauthClient.uploadKeysForRegisteredDeviceAndLogIn(request);
    } catch (e) {
      console.log(
        'Error calling uploadKeysForRegisteredDeviceAndLogIn:',
        getMessageForException(e) ?? 'unknown',
      );
      throw e;
    }

    const userID = response.getUserId();
    const accessToken = response.getAccessToken();
    const username = response.getUsername();
    const identityAuthResult = { accessToken, userID, username };

    return assertWithValidator(identityAuthResult, identityAuthResultValidator);
  };

  generateNonce: () => Promise<string> = async () => {
    const result = await this.unauthClient.generateNonce(new Empty());
    return result.getNonce();
  };

  publishWebPrekeys: (prekeys: SignedPrekeys) => Promise<void> = async (
    prekeys: SignedPrekeys,
  ) => {
    const client = this.authClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }

    const contentPrekeyUpload = new Prekey();
    contentPrekeyUpload.setPrekey(prekeys.contentPrekey);
    contentPrekeyUpload.setPrekeySignature(prekeys.contentPrekeySignature);

    const notifPrekeyUpload = new Prekey();
    notifPrekeyUpload.setPrekey(prekeys.notifPrekey);
    notifPrekeyUpload.setPrekeySignature(prekeys.notifPrekeySignature);

    const request = new IdentityAuthStructs.RefreshUserPrekeysRequest();
    request.setNewContentPrekey(contentPrekeyUpload);
    request.setNewNotifPrekey(notifPrekeyUpload);
    await client.refreshUserPrekeys(request);
  };

  getDeviceListHistoryForUser: (
    userID: string,
    sinceTimestamp?: number,
  ) => Promise<$ReadOnlyArray<SignedDeviceList>> = async (
    userID,
    sinceTimestamp,
  ) => {
    const client = this.authClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }
    const request = new IdentityAuthStructs.GetDeviceListRequest();
    request.setUserId(userID);
    if (sinceTimestamp) {
      request.setSinceTimestamp(sinceTimestamp);
    }
    const response = await client.getDeviceListForUser(request);
    const rawPayloads = response.getDeviceListUpdatesList();
    const deviceListUpdates: SignedDeviceList[] = rawPayloads.map(payload =>
      JSON.parse(payload),
    );
    return assertWithValidator(
      deviceListUpdates,
      signedDeviceListHistoryValidator,
    );
  };

  getDeviceListsForUsers: (
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<PeersDeviceLists> = async userIDs => {
    const client = this.authClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }
    const request = new IdentityAuthStructs.PeersDeviceListsRequest();
    request.setUserIdsList([...userIDs]);
    const response = await client.getDeviceListsForUsers(request);
    const rawPayloads = response.toObject()?.usersDeviceListsMap;
    const rawUsersDevicesPlatformDetails =
      response.toObject()?.usersDevicesPlatformDetailsMap;

    let usersDeviceLists: UsersSignedDeviceLists = {};
    rawPayloads.forEach(([userID, rawPayload]) => {
      usersDeviceLists = {
        ...usersDeviceLists,
        [userID]: JSON.parse(rawPayload),
      };
    });

    const usersDevicesPlatformDetails: {
      [userID: string]: { +[deviceID: string]: IdentityPlatformDetails },
    } = {};

    for (const [
      userID,
      rawUserDevicesPlatformDetails,
    ] of rawUsersDevicesPlatformDetails) {
      usersDevicesPlatformDetails[userID] = Object.fromEntries(
        rawUserDevicesPlatformDetails.devicesPlatformDetailsMap,
      );
    }

    const peersDeviceLists = {
      usersSignedDeviceLists: usersDeviceLists,
      usersDevicesPlatformDetails,
    };

    return assertWithValidator(peersDeviceLists, peersDeviceListsValidator);
  };

  syncPlatformDetails: () => Promise<void> = async () => {
    const client = this.authClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }
    await client.syncPlatformDetails(new identityUnauthStructs.Empty());
  };

  getFarcasterUsers: (
    farcasterIDs: $ReadOnlyArray<string>,
  ) => Promise<$ReadOnlyArray<FarcasterUser>> = async farcasterIDs => {
    const getFarcasterUsersRequest = new GetFarcasterUsersRequest();
    getFarcasterUsersRequest.setFarcasterIdsList([...farcasterIDs]);

    let getFarcasterUsersResponse;
    try {
      getFarcasterUsersResponse = await this.unauthClient.getFarcasterUsers(
        getFarcasterUsersRequest,
      );
    } catch (e) {
      console.log(
        'Error calling getFarcasterUsers:',
        getMessageForException(e) ?? 'unknown',
      );
      throw e;
    }

    const farcasterUsersList =
      getFarcasterUsersResponse.getFarcasterUsersList();

    const returnList = [];

    for (const user of farcasterUsersList) {
      returnList.push({
        userID: user.getUserId(),
        username: user.getUsername(),
        farcasterID: user.getFarcasterId(),
      });
    }

    return assertWithValidator(returnList, farcasterUsersValidator);
  };

  linkFarcasterAccount: (farcasterID: string) => Promise<void> =
    async farcasterID => {
      const client = this.authClient;
      if (!client) {
        throw new Error('Identity service client is not initialized');
      }
      const linkFarcasterAccountRequest =
        new IdentityAuthStructs.LinkFarcasterAccountRequest();
      linkFarcasterAccountRequest.setFarcasterId(farcasterID);
      await client.linkFarcasterAccount(linkFarcasterAccountRequest);
    };

  unlinkFarcasterAccount: () => Promise<void> = async () => {
    const client = this.authClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }
    await client.unlinkFarcasterAccount(new Empty());
  };

  findUserIdentities: (
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<UserIdentitiesResponse> = async userIDs => {
    const client = this.authClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }
    const request = new IdentityAuthStructs.UserIdentitiesRequest();
    request.setUserIdsList([...userIDs]);
    const response = await client.findUserIdentities(request);
    const responseObject = response.toObject();
    const identityObjects = responseObject?.identitiesMap;
    const reservedUserEntries = responseObject?.reservedUserIdentifiersMap;

    let identities: Identities = {};
    identityObjects.forEach(([userID, identityObject]) => {
      identities = {
        ...identities,
        [userID]: {
          ethIdentity: identityObject.ethIdentity,
          username: identityObject.username,
          farcasterID: identityObject.farcasterId,
        },
      };
    });

    const userIdentitiesResponse: UserIdentitiesResponse = {
      identities,
      reservedUserIdentifiers: Object.fromEntries(reservedUserEntries),
    };
    return assertWithValidator(
      userIdentitiesResponse,
      userIdentitiesResponseValidator,
    );
  };

  versionSupported: () => Promise<boolean> = async () => {
    const client = this.unauthClient;
    try {
      await client.ping(new Empty());
      return true;
    } catch (e) {
      if (getMessageForException(e) === 'unsupported_version') {
        return false;
      }
      throw e;
    }
  };

  changePassword: (oldPassword: string, newPassword: string) => Promise<void> =
    async (oldPassword, newPassword) => {
      const client = this.authClient;
      if (!client) {
        throw new Error('Identity service client is not initialized');
      }
      await initOpaque(this.overridedOpaqueFilepath);

      const opaqueLogin = new Login();
      const loginStartRequestBytes = opaqueLogin.start(oldPassword);

      const opaqueRegistration = new Registration();
      const registrationStartRequestBytes =
        opaqueRegistration.start(newPassword);

      const updatePasswordStartRequest =
        new IdentityAuthStructs.UpdateUserPasswordStartRequest();
      updatePasswordStartRequest.setOpaqueLoginRequest(loginStartRequestBytes);
      updatePasswordStartRequest.setOpaqueRegistrationRequest(
        registrationStartRequestBytes,
      );

      let updatePasswordStartResponse;
      try {
        updatePasswordStartResponse = await client.updateUserPasswordStart(
          updatePasswordStartRequest,
        );
      } catch (e) {
        console.log('Error calling updateUserPasswordStart:', e);
        throw new Error(
          `updateUserPasswordStart RPC failed: ${
            getMessageForException(e) ?? 'unknown'
          }`,
        );
      }

      const loginFinishRequestBytes = opaqueLogin.finish(
        updatePasswordStartResponse.getOpaqueLoginResponse_asU8(),
      );

      const registrationFinishRequestBytes = opaqueRegistration.finish(
        newPassword,
        updatePasswordStartResponse.getOpaqueRegistrationResponse_asU8(),
      );

      const updatePasswordFinishRequest =
        new IdentityAuthStructs.UpdateUserPasswordFinishRequest();
      updatePasswordFinishRequest.setSessionId(
        updatePasswordStartResponse.getSessionId(),
      );
      updatePasswordFinishRequest.setOpaqueLoginUpload(loginFinishRequestBytes);
      updatePasswordFinishRequest.setOpaqueRegistrationUpload(
        registrationFinishRequestBytes,
      );

      try {
        await client.updateUserPasswordFinish(updatePasswordFinishRequest);
      } catch (e) {
        console.log('Error calling updateUserPasswordFinish:', e);
        throw new Error(
          `updateUserPasswordFinish RPC failed: ${
            getMessageForException(e) ?? 'unknown'
          }`,
        );
      }
    };
}

function authNewDeviceKeyUpload(
  platformDetails: PlatformDetails,
  uploadData: IdentityNewDeviceKeyUpload,
): DeviceKeyUpload {
  const {
    keyPayload,
    keyPayloadSignature,
    contentPrekey,
    contentPrekeySignature,
    notifPrekey,
    notifPrekeySignature,
    contentOneTimeKeys,
    notifOneTimeKeys,
  } = uploadData;

  const identityKeyInfo = createIdentityKeyInfo(
    keyPayload,
    keyPayloadSignature,
  );

  const contentPrekeyUpload = createPrekey(
    contentPrekey,
    contentPrekeySignature,
  );

  const notifPrekeyUpload = createPrekey(notifPrekey, notifPrekeySignature);

  const deviceKeyUpload = createDeviceKeyUpload(
    platformDetails,
    identityKeyInfo,
    contentPrekeyUpload,
    notifPrekeyUpload,
    contentOneTimeKeys,
    notifOneTimeKeys,
  );

  return deviceKeyUpload;
}

function createIdentityKeyInfo(
  keyPayload: string,
  keyPayloadSignature: string,
): IdentityKeyInfo {
  const identityKeyInfo = new IdentityKeyInfo();
  identityKeyInfo.setPayload(keyPayload);
  identityKeyInfo.setPayloadSignature(keyPayloadSignature);
  return identityKeyInfo;
}

function createPrekey(prekey: string, prekeySignature: string): Prekey {
  const prekeyUpload = new Prekey();
  prekeyUpload.setPrekey(prekey);
  prekeyUpload.setPrekeySignature(prekeySignature);
  return prekeyUpload;
}

function createDeviceKeyUpload(
  platformDetails: PlatformDetails,
  identityKeyInfo: IdentityKeyInfo,
  contentPrekeyUpload: Prekey,
  notifPrekeyUpload: Prekey,
  contentOneTimeKeys: $ReadOnlyArray<string> = [],
  notifOneTimeKeys: $ReadOnlyArray<string> = [],
): DeviceKeyUpload {
  const deviceKeyUpload = new DeviceKeyUpload();
  deviceKeyUpload.setDeviceKeyInfo(identityKeyInfo);
  deviceKeyUpload.setContentUpload(contentPrekeyUpload);
  deviceKeyUpload.setNotifUpload(notifPrekeyUpload);
  deviceKeyUpload.setOneTimeContentPrekeysList([...contentOneTimeKeys]);
  deviceKeyUpload.setOneTimeNotifPrekeysList([...notifOneTimeKeys]);
  deviceKeyUpload.setDeviceType(
    platformToIdentityDeviceType[platformDetails.platform],
  );
  return deviceKeyUpload;
}

export { IdentityServiceClientWrapper };
