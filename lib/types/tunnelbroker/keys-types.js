// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type RefreshKeyRequest = {
  +type: 'RefreshKeyRequest',
  +deviceID: string,
  +numberOfKeys: number,
};

export const refreshKeysRequestValidator: TInterface<RefreshKeyRequest> =
  tShape<RefreshKeyRequest>({
    type: tString('RefreshKeyRequest'),
    deviceID: t.String,
    numberOfKeys: t.Number,
  });
