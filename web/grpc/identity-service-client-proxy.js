// @flow

import type {
  OneTimeKeysResultValues,
  SignedPrekeys,
} from 'lib/types/crypto-types.js';
import type {
  SignedDeviceList,
  SignedMessage,
  IdentityServiceClient,
  IdentityServiceAuthLayer,
  DeviceOlmOutboundKeys,
  IdentityAuthResult,
  UserDevicesOlmInboundKeys,
  UserDevicesOlmOutboundKeys,
} from 'lib/types/identity-service-types.js';
import { getConfig } from 'lib/utils/config.js';

import {
  type CommSharedWorker,
  getCommSharedWorker,
} from '../shared-worker/shared-worker-provider.js';
import { getOpaqueWasmPath } from '../shared-worker/utils/constants.js';
import {
  workerRequestMessageTypes,
  workerResponseMessageTypes,
} from '../types/worker-types.js';

class IdentityServiceClientSharedProxy implements IdentityServiceClient {
  sharedWorkerPromise: Promise<CommSharedWorker>;

  constructor(authLayer: ?IdentityServiceAuthLayer) {
    this.sharedWorkerPromise = (async () => {
      const sharedWorker = await getCommSharedWorker();
      await sharedWorker.schedule({
        type: workerRequestMessageTypes.CREATE_IDENTITY_SERVICE_CLIENT,
        opaqueWasmPath: getOpaqueWasmPath(),
        platformDetails: getConfig().platformDetails,
        authLayer,
      });

      return sharedWorker;
    })();
  }

  proxyToWorker<T>(
    method: $Keys<IdentityServiceClient>,
  ): (...args: $ReadOnlyArray<mixed>) => Promise<T> {
    return async (...args: $ReadOnlyArray<mixed>) => {
      const sharedWorker = await this.sharedWorkerPromise;
      const result = await sharedWorker.schedule({
        type: workerRequestMessageTypes.CALL_IDENTITY_CLIENT_METHOD,
        method,
        args,
      });

      if (!result) {
        throw new Error(`Worker identity call didn't return expected message`);
      } else if (
        result.type !== workerResponseMessageTypes.CALL_IDENTITY_CLIENT_METHOD
      ) {
        throw new Error(
          `Worker identity call didn't return expected message. Instead got: ${JSON.stringify(
            result,
          )}`,
        );
      }

      // Worker should return a message with the corresponding return type
      return (result.result: any);
    };
  }

  deleteUser: () => Promise<void> = this.proxyToWorker('deleteUser');

  getKeyserverKeys: (keyserverID: string) => Promise<DeviceOlmOutboundKeys> =
    this.proxyToWorker('getKeyserverKeys');

  getOutboundKeysForUser: (
    userID: string,
  ) => Promise<UserDevicesOlmOutboundKeys[]> = this.proxyToWorker(
    'getOutboundKeysForUser',
  );

  getInboundKeysForUser: (
    userID: string,
  ) => Promise<UserDevicesOlmInboundKeys> = this.proxyToWorker(
    'getInboundKeysForUser',
  );

  uploadOneTimeKeys: (oneTimeKeys: OneTimeKeysResultValues) => Promise<void> =
    this.proxyToWorker('uploadOneTimeKeys');

  logInPasswordUser: (
    username: string,
    password: string,
  ) => Promise<IdentityAuthResult> = this.proxyToWorker('logInPasswordUser');

  logInWalletUser: (
    walletAddress: string,
    siweMessage: string,
    siweSignature: string,
  ) => Promise<IdentityAuthResult> = this.proxyToWorker('logInWalletUser');

  uploadKeysForRegisteredDeviceAndLogIn: (
    userID: string,
    nonceChallengeResponse: SignedMessage,
  ) => Promise<IdentityAuthResult> = this.proxyToWorker(
    'uploadKeysForRegisteredDeviceAndLogIn',
  );

  generateNonce: () => Promise<string> = this.proxyToWorker('generateNonce');

  publishWebPrekeys: (prekeys: SignedPrekeys) => Promise<void> =
    this.proxyToWorker('publishWebPrekeys');

  getDeviceListHistoryForUser: (
    userID: string,
    sinceTimestamp?: number,
  ) => Promise<$ReadOnlyArray<SignedDeviceList>> = this.proxyToWorker(
    'getDeviceListHistoryForUser',
  );
}

export { IdentityServiceClientSharedProxy };
