// @flow

import { messageTypes } from '../../types/message-types';
import type {
  JoinThreadMessageData,
  JoinThreadMessageInfo,
  RawJoinThreadMessageInfo,
} from '../../types/message/join-thread';
import type { MessageSpec } from './message-spec';

export const joinThreadMessageSpec: MessageSpec<
  JoinThreadMessageData,
  RawJoinThreadMessageInfo,
  JoinThreadMessageInfo,
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

  createMessageInfo(rawMessageInfo, creator) {
    return {
      type: messageTypes.JOIN_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator, params) {
    return (
      `${creator} joined ` +
      params.encodedThreadEntity(messageInfo.threadID, 'this thread')
    );
  },
});
