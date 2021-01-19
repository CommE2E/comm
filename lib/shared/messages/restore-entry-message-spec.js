// @flow

import type { RestoreEntryMessageData } from '../../types/message/restore-entry';
import type { MessageSpec } from './message-spec';

export const restoreEntryMessageSpec: MessageSpec<RestoreEntryMessageData> = Object.freeze(
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
