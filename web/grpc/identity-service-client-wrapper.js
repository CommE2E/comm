// @flow

import { Login } from '@commapp/opaque-ke-wasm';

import identityServiceConfig from 'lib/facts/identity-service.js';
import type {
  IdentityServiceAuthLayer,
  IdentityServiceClient,
  OutboundKeyInfoResponse,
  IdentityAuthResult,
} from 'lib/types/identity-service-types.js';
import { DeviceType } from 'lib/types/identity-service-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { VersionInterceptor, AuthInterceptor } from './interceptor.js';
import { initOpaque } from '../crypto/opaque-utils.js';
import * as IdentityAuthClient from '../protobufs/identity-auth-client.cjs';
import * as IdentityAuthStructs from '../protobufs/identity-auth-structs.cjs';
import {
  DeviceKeyUpload,
  Empty,
  IdentityKeyInfo,
  OpaqueLoginFinishRequest,
  OpaqueLoginStartRequest,
  Prekey,
} from '../protobufs/identity-unauth-structs.cjs';
import * as IdentityUnauthClient from '../protobufs/identity-unauth.cjs';

class IdentityServiceClientWrapper implements IdentityServiceClient {
  authClient: ?IdentityAuthClient.IdentityClientServicePromiseClient;
  unauthClient: IdentityUnauthClient.IdentityClientServicePromiseClient;

  constructor(authLayer: ?IdentityServiceAuthLayer) {
    if (authLayer) {
      this.authClient =
        IdentityServiceClientWrapper.createAuthClient(authLayer);
    }
    this.unauthClient = IdentityServiceClientWrapper.createUnauthClient();
  }

  static determineSocketAddr(): string {
    return process.env.IDENTITY_SOCKET_ADDR ?? identityServiceConfig.defaultURL;
  }

  static createAuthClient(
    authLayer: IdentityServiceAuthLayer,
  ): IdentityAuthClient.IdentityClientServicePromiseClient {
    const { userID, deviceID, commServicesAccessToken } = authLayer;

    const identitySocketAddr =
      IdentityServiceClientWrapper.determineSocketAddr();

    const versionInterceptor = new VersionInterceptor<Request, Response>();
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

  static createUnauthClient(): IdentityUnauthClient.IdentityClientServicePromiseClient {
    const identitySocketAddr =
      IdentityServiceClientWrapper.determineSocketAddr();

    const versionInterceptor = new VersionInterceptor<Request, Response>();

    const unauthClientOpts = {
      unaryInterceptors: [versionInterceptor],
    };

    return new IdentityUnauthClient.IdentityClientServicePromiseClient(
      identitySocketAddr,
      null,
      unauthClientOpts,
    );
  }

  deleteUser: () => Promise<void> = async () => {
    if (!this.authClient) {
      throw new Error('Identity service client is not initialized');
    }
    await this.authClient.deleteUser(new Empty());
  };

  logInPasswordUser: (
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
  ) => Promise<IdentityAuthResult> = async (
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
    const client = this.unauthClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }
    await initOpaque();
    const opaqueLogin = new Login();
    const startRequestBytes = opaqueLogin.start(password);

    const identityKeyInfo = new IdentityKeyInfo();
    identityKeyInfo.setPayload(keyPayload);
    identityKeyInfo.setPayloadSignature(keyPayloadSignature);

    const contentPrekeyUpload = new Prekey();
    contentPrekeyUpload.setPrekey(contentPrekey);
    contentPrekeyUpload.setPrekeySignature(contentPrekeySignature);

    const notifPrekeyUpload = new Prekey();
    notifPrekeyUpload.setPrekey(notifPrekey);
    notifPrekeyUpload.setPrekeySignature(notifPrekeySignature);

    const deviceKeyUpload = new DeviceKeyUpload();
    deviceKeyUpload.setDeviceKeyInfo(identityKeyInfo);
    deviceKeyUpload.setContentUpload(contentPrekeyUpload);
    deviceKeyUpload.setNotifUpload(notifPrekeyUpload);
    deviceKeyUpload.setOneTimeContentPrekeysList(contentOneTimeKeys);
    deviceKeyUpload.setOneTimeNotifPrekeysList(notifOneTimeKeys);
    deviceKeyUpload.setDeviceType(DeviceType.WEB);

    const loginStartRequest = new OpaqueLoginStartRequest();
    loginStartRequest.setUsername(username);
    loginStartRequest.setOpaqueLoginRequest(startRequestBytes);
    loginStartRequest.setDeviceKeyUpload(deviceKeyUpload);

    let loginStartResponse;
    try {
      loginStartResponse =
        await client.logInPasswordUserStart(loginStartRequest);
    } catch (e) {
      console.log('Error calling logInPasswordUserStart:', e);
      throw new Error(
        `logInPasswordUserStart RPC failed: ${
          getMessageForException(e) ?? 'unknown'
        }`,
      );
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
      console.log('Error calling logInPasswordUserFinish:', e);
      throw new Error(
        `logInPasswordUserFinish RPC failed: ${
          getMessageForException(e) ?? 'unknown'
        }`,
      );
    }

    const userID = loginFinishResponse.getUserId();
    const accessToken = loginFinishResponse.getAccessToken();

    return { userID, accessToken, username };
  };

  getKeyserverKeys: (keyserverID: string) => Promise<?OutboundKeyInfoResponse> =
    async (keyserverID: string) => {
      const client = this.authClient;
      if (!client) {
        throw new Error('Identity service client is not initialized');
      }

      const request = new IdentityAuthStructs.OutboundKeysForUserRequest();
      request.setUserId(keyserverID);
      const response = await client.getKeyserverKeys(request);
      const keyserverInfo = response.getKeyserverInfo();
      if (!response.hasKeyserverInfo() || !keyserverInfo) {
        return null;
      }

      const identityInfo = keyserverInfo.getIdentityInfo();
      const contentPreKey = keyserverInfo.getContentPrekey();
      const notifPreKey = keyserverInfo.getNotifPrekey();

      if (!identityInfo || !contentPreKey || !notifPreKey) {
        return null;
      }

      return {
        payload: identityInfo.getPayload(),
        payloadSignature: identityInfo.getPayloadSignature(),
        socialProof: identityInfo.getSocialProof(),
        contentPrekey: contentPreKey.getPrekey(),
        contentPrekeySignature: contentPreKey.getPrekeySignature(),
        notifPrekey: notifPreKey.getPrekey(),
        notifPrekeySignature: notifPreKey.getPrekeySignature(),
        oneTimeContentPrekey: keyserverInfo.getOneTimeContentPrekey(),
        oneTimeNotifPrekey: keyserverInfo.getOneTimeNotifPrekey(),
      };
    };
}

export { IdentityServiceClientWrapper };
