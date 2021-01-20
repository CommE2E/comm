// @flow

import { messageTypes } from '../../types/message-types';
import type {
  EditEntryMessageData,
  EditEntryMessageInfo,
  RawEditEntryMessageInfo,
} from '../../types/message/edit-entry';
import type { MessageSpec } from './message-spec';

export const editEntryMessageSpec: MessageSpec<
  EditEntryMessageData,
  RawEditEntryMessageInfo,
  EditEntryMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify({
      entryID: data.entryID,
      date: data.date,
      text: data.text,
    });
  },

  rawMessageInfoFromRow(row) {
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.EDIT_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  },

  createMessageInfo(rawMessageInfo, creator) {
    return {
      type: messageTypes.EDIT_ENTRY,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      entryID: rawMessageInfo.entryID,
      date: rawMessageInfo.date,
      text: rawMessageInfo.text,
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },
});
