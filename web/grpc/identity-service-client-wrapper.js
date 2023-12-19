// @flow

import identityServiceConfig from 'lib/facts/identity-service.js';
import type {
  IdentityServiceAuthLayer,
  OutboundKeyInfoResponse,
} from 'lib/types/identity-service-types.js';

import { VersionInterceptor, AuthInterceptor } from './interceptor.js';
import * as IdentityAuthClient from '../protobufs/identity-auth-client.cjs';
import * as IdentityAuthStructs from '../protobufs/identity-auth-structs.cjs';
import { Empty } from '../protobufs/identity-unauth-structs.cjs';
import * as IdentityClient from '../protobufs/identity-unauth.cjs';

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

  async getKeyserverKeys(
    userID: string,
    deviceID: string,
    accessToken: string,
    keyserverID: string,
  ): Promise<?OutboundKeyInfoResponse> {
    if (!this.authClient) {
      const authLayer: IdentityServiceAuthLayer = {
        userID,
        deviceID,
        commServicesAccessToken: accessToken,
      };
      await this.initAuthClient(authLayer);
    }

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
  }
}

export { IdentityServiceClientWrapper };
