// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type ConnectionInitializationStatus =
  | { +type: 'Success' }
  | { +type: 'Error', +data: string };

const connectionInitializationStatusValidator = t.union([
  tShape({ type: tString('Success') }),
  tShape({ type: tString('Error'), data: t.String }),
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
