// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type AuthMessage = {
  +type: 'AuthMessage',
  +userID: string,
  +deviceID: string,
  +accessToken: string,
};

export const authMessageValidator: TInterface<AuthMessage> =
  tShape<AuthMessage>({
    type: tString('AuthMessage'),
    userID: t.String,
    deviceID: t.String,
    accessToken: t.String,
  });
