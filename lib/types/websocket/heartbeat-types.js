// @flow

import type { TInterface } from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type Heartbeat = {
  +type: 'Heartbeat',
};

export const heartbeatValidator: TInterface<Heartbeat> = tShape<Heartbeat>({
  type: tString('Heartbeat'),
});
