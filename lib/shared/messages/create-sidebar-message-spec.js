// @flow

import type { CreateSidebarMessageData } from '../../types/message/create-sidebar';
import type { MessageSpec } from './message-spec';

export const createSidebarMessageSpec: MessageSpec<CreateSidebarMessageData> = Object.freeze(
  {
    messageContent(data) {
      return JSON.stringify({
        ...data.initialThreadState,
        sourceMessageAuthorID: data.sourceMessageAuthorID,
      });
    },
  },
);
