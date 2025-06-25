// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type Failure = {
  +id: string,
  +error: string,
};

const failureValidator: TInterface<Failure> = tShape<Failure>({
  id: t.String,
  error: t.String,
});

type MessageSentSuccessStatus = { +type: 'Success', +data: string };
type MessageSentErrorStatus = { +type: 'Error', +data: Failure };
type MessageSentInvalidRequestStatus = { +type: 'InvalidRequest' };
type MessageSentUnauthenticatedStatus = { +type: 'Unauthenticated' };
type MessageSentSerializationErrorStatus = {
  +type: 'SerializationError',
  +data: string,
};
export type MessageSentStatus =
  | MessageSentSuccessStatus
  | MessageSentErrorStatus
  | MessageSentInvalidRequestStatus
  | MessageSentUnauthenticatedStatus
  | MessageSentSerializationErrorStatus;

const messageSentStatusValidator = t.union([
  tShape<MessageSentSuccessStatus>({
    type: tString('Success'),
    data: t.String,
  }),
  tShape<MessageSentErrorStatus>({
    type: tString('Error'),
    data: failureValidator,
  }),
  tShape<MessageSentInvalidRequestStatus>({ type: tString('InvalidRequest') }),
  tShape<MessageSentUnauthenticatedStatus>({
    type: tString('Unauthenticated'),
  }),
  tShape<MessageSentSerializationErrorStatus>({
    type: tString('SerializationError'),
    data: t.String,
  }),
]);

export type DeviceToTunnelbrokerRequestStatus = {
  +type: 'MessageToDeviceRequestStatus',
  +clientMessageIDs: $ReadOnlyArray<MessageSentStatus>,
};

export const messageToDeviceRequestStatusValidator: TInterface<DeviceToTunnelbrokerRequestStatus> =
  tShape<DeviceToTunnelbrokerRequestStatus>({
    type: tString('MessageToDeviceRequestStatus'),
    clientMessageIDs: t.list(messageSentStatusValidator),
  });
