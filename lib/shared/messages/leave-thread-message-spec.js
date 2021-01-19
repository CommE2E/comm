// @flow

import { messageTypes } from '../../types/message-types';
import type {
  LeaveThreadMessageData,
  LeaveThreadMessageInfo,
  RawLeaveThreadMessageInfo,
} from '../../types/message/leave-thread';
import type { MessageSpec } from './message-spec';

export const leaveThreadMessageSpec: MessageSpec<
  LeaveThreadMessageData,
  RawLeaveThreadMessageInfo,
  LeaveThreadMessageInfo,
> = Object.freeze({
  rawMessageInfoFromRow(row) {
    return {
      type: messageTypes.LEAVE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  },

  createMessageInfo(rawMessageInfo, creator) {
    return {
      type: messageTypes.LEAVE_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
    };
  },
});
