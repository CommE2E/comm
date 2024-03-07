// @flow

import { getDeviceKeyUpload } from './worker-crypto.js';
import { IdentityServiceClientWrapper } from '../../grpc/identity-service-client-wrapper.js';
import {
  type WorkerResponseMessage,
  type WorkerRequestMessage,
  workerRequestMessageTypes,
  workerResponseMessageTypes,
} from '../../types/worker-types.js';
import type { EmscriptenModule } from '../types/module';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor';

let identityClient: ?IdentityServiceClientWrapper = null;

async function processAppIdentityClientRequest(
  sqliteQueryExecutor: SQLiteQueryExecutor,
  dbModule: EmscriptenModule,
  message: WorkerRequestMessage,
): Promise<?WorkerResponseMessage> {
  if (
    message.type === workerRequestMessageTypes.CREATE_IDENTITY_SERVICE_CLIENT
  ) {
    identityClient = new IdentityServiceClientWrapper(
      message.platformDetails,
      message.opaqueWasmPath,
      message.authLayer,
      async () => getDeviceKeyUpload(),
    );
    return undefined;
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

function getIdentityClient(): ?IdentityServiceClientWrapper {
  return identityClient;
}

export { processAppIdentityClientRequest, getIdentityClient };
