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

export type MessageSentStatus =
  | { +type: 'Success', +data: string }
  | { +type: 'Error', +data: Failure }
  | { +type: 'InvalidRequest' }
  | { +type: 'SerializationError', +data: string };

const messageSentStatusValidator = t.union([
  tShape({ type: tString('Success'), data: t.String }),
  tShape({ type: tString('Error'), data: failureValidator }),
  tShape({ type: tString('InvalidRequest') }),
  tShape({ type: tString('SerializationError'), data: t.String }),
]);

export type MessageToDeviceRequestStatus = {
  +type: 'MessageToDeviceRequestStatus',
  +clientMessageIDs: $ReadOnlyArray<MessageSentStatus>,
};

export const messageToDeviceRequestStatusValidator: TInterface<MessageToDeviceRequestStatus> =
  tShape<MessageToDeviceRequestStatus>({
    type: tString('MessageToDeviceRequestStatus'),
    clientMessageIDs: t.list(messageSentStatusValidator),
  });
