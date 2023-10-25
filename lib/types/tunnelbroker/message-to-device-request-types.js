// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type MessageToDeviceRequest = {
  +type: 'MessageToDeviceRequest',
  +clientMessageID: string,
  +deviceID: string,
  +payload: string,
};

export const messageToDeviceRequestValidator: TInterface<MessageToDeviceRequest> =
  tShape<MessageToDeviceRequest>({
    type: tString('MessageToDeviceRequest'),
    clientMessageID: t.String,
    deviceID: t.String,
    payload: t.String,
  });
