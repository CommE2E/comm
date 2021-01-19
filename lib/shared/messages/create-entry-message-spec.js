// @flow

import type { CreateEntryMessageData } from '../../types/message/create-entry';
import type { MessageSpec } from './message-spec';

export const createEntryMessageSpec: MessageSpec<CreateEntryMessageData> = Object.freeze(
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
