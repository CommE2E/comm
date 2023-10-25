// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type MessageToDevice = {
  +type: 'MessageToDevice',
  +messageID: string,
  +deviceID: string,
  +payload: string,
};

export const messageToDeviceValidator: TInterface<MessageToDevice> =
  tShape<MessageToDevice>({
    type: tString('MessageToDevice'),
    messageID: t.String,
    deviceID: t.String,
    payload: t.String,
  });
