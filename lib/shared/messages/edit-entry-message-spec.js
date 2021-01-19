// @flow

import type { EditEntryMessageData } from '../../types/message/edit-entry';
import type { MessageSpec } from './message-spec';

export const editEntryMessageSpec: MessageSpec<EditEntryMessageData> = Object.freeze(
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
