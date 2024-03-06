// @flow

import { getDeviceKeyUpload } from './worker-crypto.js';
import { IdentityServiceClientWrapper } from '../../grpc/identity-service-client-wrapper.js';
import { workerRequestMessageTypes } from '../../types/worker-types.js';
import type {
  WorkerResponseMessage,
  WorkerRequestMessage,
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
  }
}

function getIdentityClient(): ?IdentityServiceClientWrapper {
  return identityClient;
}

export { processAppIdentityClientRequest, getIdentityClient };
