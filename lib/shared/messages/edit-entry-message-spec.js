// @flow

import { messageTypes } from '../../types/message-types';
import type {
  EditEntryMessageData,
  RawEditEntryMessageInfo,
} from '../../types/message/edit-entry';
import type { MessageSpec } from './message-spec';

export const editEntryMessageSpec: MessageSpec<
  EditEntryMessageData,
  RawEditEntryMessageInfo,
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
});
