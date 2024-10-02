// @flow

import type { PlatformDetails } from 'lib/types/device-types.js';

import { getNewDeviceKeyUpload } from './worker-crypto.js';
import { IdentityServiceClientWrapper } from '../../grpc/identity-service-client-wrapper.js';
import {
  type WorkerResponseMessage,
  type WorkerRequestMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
} from '../../types/worker-types.js';
import type { EmscriptenModule } from '../types/module.js';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor.js';
import { initOpaque } from '../utils/opaque-utils.js';

let identityClient: ?IdentityServiceClientWrapper = null;

async function processAppIdentityClientRequest(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
  platformDetails: PlatformDetails,
  message: WorkerRequestMessage,
): Promise<?WorkerResponseMessage> {
  if (
    message.type === workerRequestMessageTypes.CREATE_IDENTITY_SERVICE_CLIENT
  ) {
    void initOpaque(message.opaqueWasmPath);
    identityClient = new IdentityServiceClientWrapper(
      platformDetails,
      message.opaqueWasmPath,
      message.authLayer,
      async () => getNewDeviceKeyUpload(),
    );
    return undefined;
  }

  if (!identityClient) {
    throw new Error('Identity client not created');
  }

  if (message.type === workerRequestMessageTypes.CALL_IDENTITY_CLIENT_METHOD) {
    // Flow doesn't allow us to access methods like this (it needs an index
    // signature declaration in the object type)
    const method: (...$ReadOnlyArray<mixed>) => mixed = (identityClient: any)[
      message.method
    ];
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

function getIdentityClient(): ?IdentityServiceClientWrapper {
  return identityClient;
}

export { processAppIdentityClientRequest, getIdentityClient };
