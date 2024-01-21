// @flow

import identityServiceConfig from 'lib/facts/identity-service.js';
import {
  type IdentityServiceAuthLayer,
  type IdentityServiceClient,
  type DeviceOlmOutboundKeys,
  deviceOlmOutboundKeysValidator,
} from 'lib/types/identity-service-types.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import { VersionInterceptor, AuthInterceptor } from './interceptor.js';
import * as IdentityAuthClient from '../protobufs/identity-auth-client.cjs';
import * as IdentityAuthStructs from '../protobufs/identity-auth-structs.cjs';
import { Empty } from '../protobufs/identity-unauth-structs.cjs';
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
        socialProof: identityInfo?.getSocialProof(),
      };

      if (!keyserverKeys.contentInitializationInfo.oneTimeKey) {
        throw new Error('Missing content one time key');
      }
      if (!keyserverKeys.notifInitializationInfo.oneTimeKey) {
        throw new Error('Missing notif one time key');
      }

      return assertWithValidator(keyserverKeys, deviceOlmOutboundKeysValidator);
    };
}

export { IdentityServiceClientWrapper };
