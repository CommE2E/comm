// @flow

import identityServiceConfig from 'lib/facts/identity-service.js';
import type {
  IdentityServiceAuthLayer,
  OutboundKeyInfo,
} from 'lib/types/identity-service-types.js';

import { VersionInterceptor, AuthInterceptor } from './interceptor.js';
import * as IdentityAuthClient from '../protobufs/identity-auth-client.cjs';
import * as IdentityAuthStructs from '../protobufs/identity-auth-structs.cjs';
import * as IdentityClient from '../protobufs/identity-client.cjs';
import { Empty } from '../protobufs/identity-structs.cjs';

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

  async deleteUser(
    userID: string,
    deviceID: string,
    accessToken: string,
  ): Promise<void> {
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
  }

  async getKeyserverKeys(
    userAuth: IdentityServiceAuthLayer,
    keyserverID: string,
  ): Promise<?OutboundKeyInfo> {
    if (!this.authClient) {
      await this.initAuthClient(userAuth);
    }

    const client = this.authClient;
    if (!client) {
      throw new Error('Identity service client is not initialized');
    }

    const request = new IdentityAuthStructs.OutboundKeysForUserRequest();
    request.setUserid(keyserverID);
    const response = await client.getKeyserverKeys(request);
    const keyserverInfo = response.getKeyserverinfo();
    if (!response.hasKeyserverinfo() || !keyserverInfo) {
      return null;
    }

    const identityInfo = keyserverInfo.getIdentityinfo();
    const contentPreKey = keyserverInfo.getContentprekey();
    const notifPreKey = keyserverInfo.getNotifprekey();

    return {
      identityInfo: identityInfo
        ? {
            payload: identityInfo.getPayload(),
            payloadSignature: identityInfo.getPayloadsignature(),
            socialProof: identityInfo.getSocialproof(),
          }
        : null,
      contentPreKey: contentPreKey
        ? {
            preKey: contentPreKey.getPrekey(),
            preKeySignature: contentPreKey.getPrekeysignature(),
          }
        : null,
      notifPreKey: notifPreKey
        ? {
            preKey: notifPreKey.getPrekey(),
            preKeySignature: notifPreKey.getPrekeysignature(),
          }
        : null,
      oneTimeContentPreKey: keyserverInfo.getOnetimecontentprekey(),
      oneTimeNotifPreKey: keyserverInfo.getOnetimenotifprekey(),
    };
  }
}

export { IdentityServiceClientWrapper };
