// @flow

import type { DeleteEntryMessageData } from '../../types/message/delete-entry';
import type { MessageSpec } from './message-spec';

export const deleteEntryMessageSpec: MessageSpec<DeleteEntryMessageData> = Object.freeze(
  {
    messageContent(data) {
      return JSON.stringify({
        entryID: data.entryID,
        date: data.date,
        text: data.text,
      });
    },
  },
);
