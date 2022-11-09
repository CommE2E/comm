// @flow

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import type { IdentityServiceClient } from 'lib/types/grpc-types';

const PROTO_PATH = '../shared/protos/identity.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const identity = grpc.loadPackageDefinition(packageDefinition).identity;
const identityClient: IdentityServiceClient = new identity.IdentityService(
  'localhost:50051',
  grpc.credentials.createInsecure(),
);

export { identityClient };
