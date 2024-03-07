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

  if (message.type === workerRequestMessageTypes.CALL_IDENTITY_CLIENT_METHOD) {
    // Flow doesn't allow us to access methods like this (it needs an index
    // signature declaration in the object type)
    // $FlowFixMe
    const method = identityClient[message.method];
    if (typeof method !== 'function') {
      throw new Error(
        `Couldn't find identity client method with name '${message.method}'`,
      );
    }
    const result = await method(...message.args);
    return {
      type: workerResponseMessageTypes.CALL_IDENTITY_CLIENT_METHOD,
      result,
    };
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
