// @flow

import type {
  OneTimeKeysResultValues,
  SignedPrekeys,
} from 'lib/types/crypto-types.js';
import type {
  IdentityServiceClient,
  IdentityServiceAuthLayer,
  DeviceOlmOutboundKeys,
  IdentityAuthResult,
  UserDevicesOlmInboundKeys,
  UserDevicesOlmOutboundKeys,
} from 'lib/types/identity-service-types.js';
import { getConfig } from 'lib/utils/config.js';

import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import type { CommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { opaqueWasmPath } from '../shared-worker/utils/constants.js';
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
        opaqueWasmPath: opaqueWasmPath(),
        platformDetails: getConfig().platformDetails,
        authLayer,
      });

      return sharedWorker;
    })();
  }

  deleteUser: () => Promise<void> = async () => {
    const sharedWorker = await this.sharedWorkerPromise;
    await sharedWorker.schedule({
      type: workerRequestMessageTypes.IDENTITY_DELETE_USER,
    });
  };

  getKeyserverKeys: (keyserverID: string) => Promise<DeviceOlmOutboundKeys> =
    async (keyserverID: string) => {
      const sharedWorker = await this.sharedWorkerPromise;
      const result = await sharedWorker.schedule({
        type: workerRequestMessageTypes.IDENTITY_GET_KEYSERVER_KEYS,
        keyserverID,
      });

      if (!result) {
        throw new Error(`Worker identity call didn't return expected message`);
      } else if (
        result.type !== workerResponseMessageTypes.IDENTITY_GET_KEYSERVER_KEYS
      ) {
        throw new Error(
          `Worker identity call didn't return expected message. Instead got: ${JSON.stringify(
            result,
          )}`,
        );
      }

      return result.keys;
    };

  getOutboundKeysForUser: (
    userID: string,
  ) => Promise<UserDevicesOlmOutboundKeys[]> = async (userID: string) => {
    const sharedWorker = await this.sharedWorkerPromise;
    const result = await sharedWorker.schedule({
      type: workerRequestMessageTypes.IDENTITY_GET_OUTBOUND_KEYS_FOR_USER,
      userID,
    });

    if (!result) {
      throw new Error(`Worker identity call didn't return expected message`);
    } else if (
      result.type !==
      workerResponseMessageTypes.IDENTITY_GET_OUTBOUND_KEYS_FOR_USER
    ) {
      throw new Error(
        `Worker identity call didn't return expected message. Instead got: ${JSON.stringify(
          result,
        )}`,
      );
    }

    return result.keys;
  };

  getInboundKeysForUser: (
    userID: string,
  ) => Promise<UserDevicesOlmInboundKeys> = async (userID: string) => {
    const sharedWorker = await this.sharedWorkerPromise;
    const result = await sharedWorker.schedule({
      type: workerRequestMessageTypes.IDENTITY_GET_INBOUND_KEYS_FOR_USER,
      userID,
    });

    if (!result) {
      throw new Error(`Worker identity call didn't return expected message`);
    } else if (
      result.type !==
      workerResponseMessageTypes.IDENTITY_GET_INBOUND_KEYS_FOR_USER
    ) {
      throw new Error(
        `Worker identity call didn't return expected message. Instead got: ${JSON.stringify(
          result,
        )}`,
      );
    }

    return result.keys;
  };

  uploadOneTimeKeys: (oneTimeKeys: OneTimeKeysResultValues) => Promise<void> =
    async (oneTimeKeys: OneTimeKeysResultValues) => {
      const sharedWorker = await this.sharedWorkerPromise;
      await sharedWorker.schedule({
        type: workerRequestMessageTypes.IDENTITY_UPLOAD_ONE_TIME_KEYS,
        oneTimeKeys,
      });
    };

  logInPasswordUser: (
    username: string,
    password: string,
  ) => Promise<IdentityAuthResult> = async (
    username: string,
    password: string,
  ) => {
    const sharedWorker = await this.sharedWorkerPromise;
    const result = await sharedWorker.schedule({
      type: workerRequestMessageTypes.IDENTITY_LOG_IN_PASSWORD_USER,
      username,
      password,
    });

    if (!result) {
      throw new Error(`Worker identity call didn't return expected message`);
    } else if (
      result.type !== workerResponseMessageTypes.IDENTITY_AUTH_RESULT
    ) {
      throw new Error(
        `Worker identity call didn't return expected message. Instead got: ${JSON.stringify(
          result,
        )}`,
      );
    }

    return result.result;
  };

  logInWalletUser: (
    walletAddress: string,
    siweMessage: string,
    siweSignature: string,
  ) => Promise<IdentityAuthResult> = async (
    walletAddress: string,
    siweMessage: string,
    siweSignature: string,
  ) => {
    const sharedWorker = await this.sharedWorkerPromise;
    const result = await sharedWorker.schedule({
      type: workerRequestMessageTypes.IDENTITY_LOG_IN_WALLET_USER,
      walletAddress,
      siweMessage,
      siweSignature,
    });

    if (!result) {
      throw new Error(`Worker identity call didn't return expected message`);
    } else if (
      result.type !== workerResponseMessageTypes.IDENTITY_AUTH_RESULT
    ) {
      throw new Error(
        `Worker identity call didn't return expected message. Instead got: ${JSON.stringify(
          result,
        )}`,
      );
    }

    return result.result;
  };

  generateNonce: () => Promise<string> = async () => {
    const sharedWorker = await this.sharedWorkerPromise;
    const result = await sharedWorker.schedule({
      type: workerRequestMessageTypes.IDENTITY_GENERATE_NONCE,
    });

    if (!result) {
      throw new Error(`Worker identity call didn't return expected message`);
    } else if (
      result.type !== workerResponseMessageTypes.IDENTITY_GENERATE_NONCE
    ) {
      throw new Error(
        `Worker identity call didn't return expected message. Instead got: ${JSON.stringify(
          result,
        )}`,
      );
    }

    return result.nonce;
  };

  publishWebPrekeys: (prekeys: SignedPrekeys) => Promise<void> = async (
    prekeys: SignedPrekeys,
  ) => {
    const sharedWorker = await this.sharedWorkerPromise;
    await sharedWorker.schedule({
      type: workerRequestMessageTypes.IDENTITY_PUBLISH_WEB_PREKEYS,
      prekeys,
    });
  };
}

export { IdentityServiceClientSharedProxy };
