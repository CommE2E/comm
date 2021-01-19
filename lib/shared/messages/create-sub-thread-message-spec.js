// @flow

import type { CreateSubthreadMessageData } from '../../types/message/create-subthread';
import type { MessageSpec } from './message-spec';

export const createSubThreadMessageSpec: MessageSpec<CreateSubthreadMessageData> = Object.freeze(
  {
    messageContent(data) {
      return data.childThreadID;
    },
  },
);
