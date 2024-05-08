// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import type { SIWENonceResponse } from '../siwe-types.js';

export const siweNonceResponseValidator: TInterface<SIWENonceResponse> =
  tShape<SIWENonceResponse>({ nonce: t.String });
