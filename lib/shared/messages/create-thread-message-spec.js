// @flow

import type { CreateThreadMessageData } from '../../types/message/create-thread';
import type { MessageSpec } from './message-spec';

export const createThreadMessageSpec: MessageSpec<CreateThreadMessageData> = Object.freeze(
  {
    messageContent(data) {
      return JSON.stringify(data.initialThreadState);
    },
  },
);
