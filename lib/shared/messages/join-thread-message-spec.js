// @flow

import { messageTypes } from '../../types/message-types';
import type {
  JoinThreadMessageData,
  RawJoinThreadMessageInfo,
} from '../../types/message/join-thread';
import type { MessageSpec } from './message-spec';

export const joinThreadMessageSpec: MessageSpec<
  JoinThreadMessageData,
  RawJoinThreadMessageInfo,
> = Object.freeze({
  rawMessageInfoFromRow(row) {
    return {
      type: messageTypes.JOIN_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  },
});
