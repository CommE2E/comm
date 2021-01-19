// @flow

import { messageTypes } from '../../types/message-types';
import type {
  RawTextMessageInfo,
  TextMessageData,
} from '../../types/message/text';
import type { MessageSpec } from './message-spec';

export const textMessageSpec: MessageSpec<
  TextMessageData,
  RawTextMessageInfo,
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
});
