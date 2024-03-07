// @flow

import type { PlatformDetails } from 'lib/types/device-types.js';
import type { IdentityServiceAuthLayer } from 'lib/types/identity-service-types.js';

import { getDeviceKeyUpload } from './worker-crypto.js';
import { IdentityServiceClientWrapper } from '../../grpc/identity-service-client-wrapper.js';
import type {
  WorkerResponseMessage,
  WorkerRequestMessage,
} from '../../types/worker-types.js';
import {
  workerRequestMessageTypes,
  workerResponseMessageTypes,
} from '../../types/worker-types.js';
import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';

let identityClient: ?IdentityServiceClientWrapper = null;

async function processAppIdentityClientRequest(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
  message: WorkerRequestMessage,
): Promise<?WorkerResponseMessage> {
  if (
    message.type === workerRequestMessageTypes.CREATE_IDENTITY_SERVICE_CLIENT
  ) {
    createIdentityServiceClient(
      sqliteQueryExecutor,
      dbModule,
      message.opaqueWasmPath,
      message.platformDetails,
      message.authLayer,
    );
  }

  if (!identityClient) {
    throw new Error('Identity client not created');
  }

  if (message.type === workerRequestMessageTypes.IDENTITY_DELETE_USER) {
    await identityClient.deleteUser();
  } else if (
    message.type === workerRequestMessageTypes.IDENTITY_GET_KEYSERVER_KEYS
  ) {
    return {
      type: workerResponseMessageTypes.IDENTITY_GET_KEYSERVER_KEYS,
      keys: await identityClient.getKeyserverKeys(message.keyserverID),
    };
  } else if (
    message.type ===
    workerRequestMessageTypes.IDENTITY_GET_OUTBOUND_KEYS_FOR_USER
  ) {
    return {
      type: workerResponseMessageTypes.IDENTITY_GET_OUTBOUND_KEYS_FOR_USER,
      keys: await identityClient.getOutboundKeysForUser(message.userID),
    };
  } else if (
    message.type ===
    workerRequestMessageTypes.IDENTITY_GET_INBOUND_KEYS_FOR_USER
  ) {
    return {
      type: workerResponseMessageTypes.IDENTITY_GET_INBOUND_KEYS_FOR_USER,
      keys: await identityClient.getInboundKeysForUser(message.userID),
    };
  } else if (
    message.type === workerRequestMessageTypes.IDENTITY_UPLOAD_ONE_TIME_KEYS
  ) {
    await identityClient.uploadOneTimeKeys(message.oneTimeKeys);
  } else if (
    message.type === workerRequestMessageTypes.IDENTITY_LOG_IN_PASSWORD_USER
  ) {
    return {
      type: workerResponseMessageTypes.IDENTITY_AUTH_RESULT,
      result: await identityClient.logInPasswordUser(
        message.username,
        message.password,
      ),
    };
  } else if (
    message.type === workerRequestMessageTypes.IDENTITY_LOG_IN_WALLET_USER
  ) {
    return {
      type: workerResponseMessageTypes.IDENTITY_AUTH_RESULT,
      result: await identityClient.logInWalletUser(
        message.walletAddress,
        message.siweMessage,
        message.siweSignature,
      ),
    };
  } else if (
    message.type === workerRequestMessageTypes.IDENTITY_GENERATE_NONCE
  ) {
    return {
      type: workerResponseMessageTypes.IDENTITY_GENERATE_NONCE,
      nonce: await identityClient.generateNonce(),
    };
  } else if (
    message.type === workerRequestMessageTypes.IDENTITY_PUBLISH_WEB_PREKEYS
  ) {
    await identityClient.publishWebPrekeys(message.prekeys);
  }

  return undefined;
}

function createIdentityServiceClient(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
  opaqueWasmPath: string,
  platformDetails: PlatformDetails,
  authLayer: ?IdentityServiceAuthLayer,
) {
  identityClient = new IdentityServiceClientWrapper(
    platformDetails,
    opaqueWasmPath,
    authLayer,
    () => Promise.resolve(getDeviceKeyUpload(sqliteQueryExecutor, dbModule)),
  );
}

export { processAppIdentityClientRequest };
