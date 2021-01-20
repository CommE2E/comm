// @flow

import { messageTypes } from '../../types/message-types';
import type {
  RawTextMessageInfo,
  TextMessageData,
  TextMessageInfo,
} from '../../types/message/text';
import type { MessageSpec } from './message-spec';

export const textMessageSpec: MessageSpec<
  TextMessageData,
  RawTextMessageInfo,
  TextMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return data.text;
  },

  rawMessageInfoFromRow(row, params) {
    const rawTextMessageInfo: RawTextMessageInfo = {
      type: messageTypes.TEXT,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      text: row.content,
    };
    if (params.localID) {
      rawTextMessageInfo.localID = params.localID;
    }
    return rawTextMessageInfo;
  },

  createMessageInfo(rawMessageInfo, creator) {
    const messageInfo: TextMessageInfo = {
      type: messageTypes.TEXT,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      text: rawMessageInfo.text,
    };
    if (rawMessageInfo.id) {
      messageInfo.id = rawMessageInfo.id;
    }
    if (rawMessageInfo.localID) {
      messageInfo.localID = rawMessageInfo.localID;
    }
    return messageInfo;
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },
});
