// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type MessageToTunnelbrokerRequest = {
  +type: 'MessageToTunnelbrokerRequest',
  +clientMessageID: string,
  +payload: string,
};

export const messageToTunnelbrokerRequestValidator: TInterface<MessageToTunnelbrokerRequest> =
  tShape<MessageToTunnelbrokerRequest>({
    type: tString('MessageToTunnelbrokerRequest'),
    clientMessageID: t.String,
    payload: t.String,
  });
