// @flow

import { Login } from '@commapp/opaque-ke-wasm';

import identityServiceConfig from 'lib/facts/identity-service.js';
import type { IdentityServiceAuthLayer } from 'lib/types/identity-service-types.js';

import { VersionInterceptor, AuthInterceptor } from './interceptor.js';
import { initOpaque } from '../crypto/opaque-utils.js';
import * as IdentityAuthClient from '../protobufs/identity-auth-client.cjs';
import * as IdentityClient from '../protobufs/identity-client.cjs';
import {
  DeviceKeyUpload,
  Empty,
  IdentityKeyInfo,
  OpaqueLoginFinishRequest,
  OpaqueLoginStartRequest,
  PreKey,
} from '../protobufs/identity-structs.cjs';

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
    identityKeyInfo.setPayloadsignature(keyPayloadSignature);

    const contentPrekeyUpload = new PreKey();
    contentPrekeyUpload.setPrekey(contentPrekey);
    contentPrekeyUpload.setPrekeysignature(contentPrekeySignature);

    const notifPrekeyUpload = new PreKey();
    notifPrekeyUpload.setPrekey(notifPrekey);
    notifPrekeyUpload.setPrekeysignature(notifPrekeySignature);

    const deviceKeyUpload = new DeviceKeyUpload();
    deviceKeyUpload.setDevicekeyinfo(identityKeyInfo);
    deviceKeyUpload.setContentupload(contentPrekeyUpload);
    deviceKeyUpload.setNotifupload(notifPrekeyUpload);
    deviceKeyUpload.setOnetimecontentprekeysList(contentOneTimeKeys);
    deviceKeyUpload.setOnetimenotifprekeysList(notifOneTimeKeys);
    deviceKeyUpload.setDevicetype(webDeviceType);

    const loginStartRequest = new OpaqueLoginStartRequest();
    loginStartRequest.setUsername(username);
    loginStartRequest.setOpaqueloginrequest(startRequestBytes);
    loginStartRequest.setDevicekeyupload(deviceKeyUpload);

    const loginStartResponse = await client.loginPasswordUserStart(
      loginStartRequest,
    );

    const finishRequestBytes = opaqueLogin.finish(
      loginStartResponse.getOpaqueloginresponse_asU8(),
    );

    const loginFinishRequest = new OpaqueLoginFinishRequest();
    loginFinishRequest.setSessionid(loginStartResponse.getSessionid());
    loginFinishRequest.setOpaqueloginupload(finishRequestBytes);

    const loginFinishResponse = await client.loginPasswordUserFinish(
      loginFinishRequest,
    );

    const userID = loginFinishResponse.getUserid();
    const accessToken = loginFinishResponse.getAccesstoken();

    return JSON.stringify({ userID, accessToken });
  };
}

export { IdentityServiceClientWrapper };
