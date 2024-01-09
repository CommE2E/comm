// @flow

import identityServiceConfig from 'lib/facts/identity-service.js';
import type {
  IdentityServiceAuthLayer,
  IdentityServiceClient,
  OutboundKeyInfoResponse,
} from 'lib/types/identity-service-types.js';

import { VersionInterceptor, AuthInterceptor } from './interceptor.js';
import * as IdentityAuthClient from '../protobufs/identity-auth-client.cjs';
import * as IdentityAuthStructs from '../protobufs/identity-auth-structs.cjs';
import * as IdentityClient from '../protobufs/identity-client.cjs';
import { Empty } from '../protobufs/identity-structs.cjs';

class IdentityServiceClientWrapper implements IdentityServiceClient {
  authClient: ?IdentityAuthClient.IdentityClientServicePromiseClient;
  unauthorizedClient: IdentityClient.IdentityClientServicePromiseClient;

  constructor(authLayer: ?IdentityServiceAuthLayer) {
    if (authLayer) {
      this.authClient =
        IdentityServiceClientWrapper.createAuthClient(authLayer);
    }
    this.unauthorizedClient =
      IdentityServiceClientWrapper.createUnauthorizedClient();
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

  static createUnauthorizedClient(): IdentityClient.IdentityClientServicePromiseClient {
    const identitySocketAddr =
      IdentityServiceClientWrapper.determineSocketAddr();

    const versionInterceptor = new VersionInterceptor<Request, Response>();

    const unauthorizedClientOpts = {
      unaryInterceptors: [versionInterceptor],
    };

    return new IdentityClient.IdentityClientServicePromiseClient(
      identitySocketAddr,
      null,
      unauthorizedClientOpts,
    );
  }

  deleteUser: () => Promise<void> = async () => {
    if (!this.authClient) {
      throw new Error('Identity service client is not initialized');
    }
    await this.authClient.deleteUser(new Empty());
  };

  getKeyserverKeys: (keyserverID: string) => Promise<?OutboundKeyInfoResponse> =
    async (keyserverID: string) => {
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

      if (!identityInfo || !contentPreKey || !notifPreKey) {
        return null;
      }

      return {
        payload: identityInfo.getPayload(),
        payloadSignature: identityInfo.getPayloadsignature(),
        socialProof: identityInfo.getSocialproof(),
        contentPrekey: contentPreKey.getPrekey(),
        contentPrekeySignature: contentPreKey.getPrekeysignature(),
        notifPrekey: notifPreKey.getPrekey(),
        notifPrekeySignature: notifPreKey.getPrekeysignature(),
        oneTimeContentPrekey: keyserverInfo.getOnetimecontentprekey(),
        oneTimeNotifPrekey: keyserverInfo.getOnetimenotifprekey(),
      };
    };
}

export { IdentityServiceClientWrapper };
