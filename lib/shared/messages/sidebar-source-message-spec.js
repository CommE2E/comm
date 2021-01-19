// @flow

import type { SidebarSourceMessageData } from '../../types/message-types';
import type { MessageSpec } from './message-spec';

export const sidebarSourceMessageSpec: MessageSpec<SidebarSourceMessageData> = Object.freeze(
  {
    messageContent(data) {
      return JSON.stringify({
        sourceMessageID: data.sourceMessage.id,
      });
    },
  },
);
