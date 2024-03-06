// @flow

import type { PlatformDetails } from 'lib/types/device-types.js';
import type { IdentityServiceAuthLayer } from 'lib/types/identity-service-types.js';

import { getDeviceKeyUpload } from './worker-crypto.js';
import { IdentityServiceClientWrapper } from '../../grpc/identity-service-client-wrapper.js';
import { workerRequestMessageTypes } from '../../types/worker-types.js';
import type {
  WorkerResponseMessage,
  WorkerRequestMessage,
} from '../../types/worker-types.js';
import type { EmscriptenModule } from '../types/module';
import type { SQLiteQueryExecutor } from '../types/sqlite-query-executor';

// eslint-disable-next-line no-unused-vars
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
