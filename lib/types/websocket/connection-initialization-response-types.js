// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

type ConnectionInitializationSuccessStatus = { +type: 'Success' };
type ConnectionInitializationErrorStatus = { +type: 'Error', +data: string };
export type ConnectionInitializationStatus =
  | ConnectionInitializationSuccessStatus
  | ConnectionInitializationErrorStatus;

const connectionInitializationStatusValidator = t.union([
  tShape<ConnectionInitializationSuccessStatus>({ type: tString('Success') }),
  tShape<ConnectionInitializationErrorStatus>({
    type: tString('Error'),
    data: t.String,
  }),
]);

export type ConnectionInitializationResponse = {
  +type: 'ConnectionInitializationResponse',
  +status: ConnectionInitializationStatus,
};

export const connectionInitializationResponseValidator: TInterface<ConnectionInitializationResponse> =
  tShape<ConnectionInitializationResponse>({
    type: tString('ConnectionInitializationResponse'),
    status: connectionInitializationStatusValidator,
  });
