// @flow

import { Login } from '@commapp/opaque-ke-wasm';

import identityServiceConfig from 'lib/facts/identity-service.js';
import type { IdentityServiceAuthLayer } from 'lib/types/identity-service-types.js';

import { VersionInterceptor, AuthInterceptor } from './interceptor.js';
import { initOpaque } from '../crypto/opaque-utils.js';
import * as IdentityAuthClient from '../protobufs/identity-auth-client.cjs';
import {
  DeviceKeyUpload,
  Empty,
  IdentityKeyInfo,
  OpaqueLoginFinishRequest,
  OpaqueLoginStartRequest,
  Prekey,
} from '../protobufs/identity-unauth-structs.cjs';
import * as IdentityClient from '../protobufs/identity-unauth.cjs';

const webDeviceType = 1;

class IdentityServiceClientWrapper {
  authClient: ?IdentityAuthClient.IdentityClientServicePromiseClient;
  unauthorizedClient: ?IdentityClient.IdentityClientServicePromiseClient;

  constructor() {
    this.authClient = null;
    this.unauthorizedClient = null;
  }

  determineSocketAddr(): string {
    return process.env.IDENTITY_SOCKET_ADDR ?? identityServiceConfig.defaultURL;
  }

  async initAuthClient(authLayer: IdentityServiceAuthLayer): Promise<void> {
    const { userID, deviceID, commServicesAccessToken } = authLayer;

    const identitySocketAddr = this.determineSocketAddr();

    const versionInterceptor = new VersionInterceptor<Request, Response>();
    const authInterceptor = new AuthInterceptor<Request, Response>(
      userID,
      deviceID,
      commServicesAccessToken,
    );

    const authClientOpts = {
      unaryInterceptors: [versionInterceptor, authInterceptor],
    };

    this.authClient = new IdentityAuthClient.IdentityClientServicePromiseClient(
      identitySocketAddr,
      null,
      authClientOpts,
    );
  }

  async initUnauthorizedClient(): Promise<void> {
    const identitySocketAddr = this.determineSocketAddr();

    const versionInterceptor = new VersionInterceptor<Request, Response>();

    const unauthorizedClientOpts = {
      unaryInterceptors: [versionInterceptor],
    };

    this.unauthorizedClient =
      new IdentityClient.IdentityClientServicePromiseClient(
        identitySocketAddr,
        null,
        unauthorizedClientOpts,
      );
  }

  deleteUser: (
    userID: string,
    deviceID: string,
    accessToken: string,
  ) => Promise<void> = async (
    userID: string,
    deviceID: string,
    accessToken: string,
  ): Promise<void> => {
    if (!this.authClient) {
      const authLayer: IdentityServiceAuthLayer = {
        userID,
        deviceID,
        commServicesAccessToken: accessToken,
      };
      await this.initAuthClient(authLayer);
    }

    if (this.authClient) {
      await this.authClient.deleteUser(new Empty());
    } else {
      throw new Error('Identity service client is not initialized');
    }
  };

  loginUser: (
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
  ) => Promise<string> = async (
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
  ): Promise<string> => {
    if (!this.unauthorizedClient) {
      await this.initUnauthorizedClient();
    }

    const client = this.unauthorizedClient;
    if (!client) {
      throw new Error('Failed to initialize identity service client');
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
    deviceKeyUpload.setDeviceType(webDeviceType);

    const loginStartRequest = new OpaqueLoginStartRequest();
    loginStartRequest.setUsername(username);
    loginStartRequest.setOpaqueLoginRequest(startRequestBytes);
    loginStartRequest.setDeviceKeyUpload(deviceKeyUpload);

    const logInStartResponse =
      await client.logInPasswordUserStart(loginStartRequest);

    const finishRequestBytes = opaqueLogin.finish(
      logInStartResponse.getOpaqueLoginResponse_asU8(),
    );

    const logInFinishRequest = new OpaqueLoginFinishRequest();
    logInFinishRequest.setSessionId(logInStartResponse.getSessionId());
    logInFinishRequest.setOpaqueLoginUpload(finishRequestBytes);

    const logInFinishResponse =
      await client.logInPasswordUserFinish(logInFinishRequest);

    const userID = logInFinishResponse.getUserId();
    const accessToken = logInFinishResponse.getAccessToken();

    return JSON.stringify({ userID, accessToken });
  };
}

export { IdentityServiceClientWrapper };
