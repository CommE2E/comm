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
import { Empty } from '../protobufs/identity-unauth-structs.cjs';
import * as IdentityClient from '../protobufs/identity-unauth.cjs';

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
