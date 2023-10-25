// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type MessageReceiveConfirmation = {
  +type: 'MessageReceiveConfirmation',
  +messageIDs: $ReadOnlyArray<string>,
};

export const messageReceiveConfirmationValidator: TInterface<MessageReceiveConfirmation> =
  tShape<MessageReceiveConfirmation>({
    type: tString('MessageReceiveConfirmation'),
    messageIDs: t.list(t.String),
  });
