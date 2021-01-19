// @flow

import { messageTypes } from '../../types/message-types';
import type {
  RawRestoreEntryMessageInfo,
  RestoreEntryMessageData,
} from '../../types/message/restore-entry';
import type { MessageSpec } from './message-spec';

export const restoreEntryMessageSpec: MessageSpec<
  RestoreEntryMessageData,
  RawRestoreEntryMessageInfo,
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
      type: messageTypes.RESTORE_ENTRY,
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
