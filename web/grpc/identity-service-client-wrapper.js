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

const webDeviceType = Object.freeze(1);

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

  initAuthClient(
    authLayer: IdentityServiceAuthLayer,
  ): IdentityAuthClient.IdentityClientServicePromiseClient {
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

    return this.authClient;
  }

  initUnauthorizedClient(): IdentityClient.IdentityClientServicePromiseClient {
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

    return this.unauthorizedClient;
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
    const authClient =
      this.authClient ||
      this.initAuthClient({
        userID,
        deviceID,
        commServicesAccessToken: accessToken,
      });

    await authClient.deleteUser(new Empty());
  };

  loginPasswordUser: (
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
    const client = this.unauthorizedClient || this.initUnauthorizedClient();

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

    let loginStartResponse;
    try {
      loginStartResponse =
        await client.logInPasswordUserStart(loginStartRequest);
    } catch (startError) {
      startError.method = 'loginPasswordUserStart';
      throw startError;
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
    } catch (finishError) {
      finishError.method = 'loginPasswordUserFinish';
      throw finishError;
    }

    const userID = loginFinishResponse.getUserId();
    const accessToken = loginFinishResponse.getAccessToken();

    return JSON.stringify({ userID, accessToken });
  };
}

export { IdentityServiceClientWrapper };
