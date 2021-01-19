// @flow

import { messageTypes } from '../../types/message-types';
import type {
  DeleteEntryMessageData,
  RawDeleteEntryMessageInfo,
} from '../../types/message/delete-entry';
import type { MessageSpec } from './message-spec';

export const deleteEntryMessageSpec: MessageSpec<
  DeleteEntryMessageData,
  RawDeleteEntryMessageInfo,
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
      type: messageTypes.DELETE_ENTRY,
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
