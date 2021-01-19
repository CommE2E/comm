// @flow

import { messageTypes } from '../../types/message-types';
import type {
  CreateThreadMessageData,
  RawCreateThreadMessageInfo,
} from '../../types/message/create-thread';
import type { MessageSpec } from './message-spec';

export const createThreadMessageSpec: MessageSpec<
  CreateThreadMessageData,
  RawCreateThreadMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify(data.initialThreadState);
  },

  rawMessageInfoFromRow(row) {
    return {
      type: messageTypes.CREATE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      initialThreadState: JSON.parse(row.content),
    };
  },
});
