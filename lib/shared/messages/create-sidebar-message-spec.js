// @flow

import { messageTypes } from '../../types/message-types';
import type {
  CreateSidebarMessageData,
  RawCreateSidebarMessageInfo,
} from '../../types/message/create-sidebar';
import type { MessageSpec } from './message-spec';

export const createSidebarMessageSpec: MessageSpec<
  CreateSidebarMessageData,
  RawCreateSidebarMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify({
      ...data.initialThreadState,
      sourceMessageAuthorID: data.sourceMessageAuthorID,
    });
  },

  rawMessageInfoFromRow(row) {
    const { sourceMessageAuthorID, ...initialThreadState } = JSON.parse(
      row.content,
    );
    return {
      type: messageTypes.CREATE_SIDEBAR,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      sourceMessageAuthorID,
      initialThreadState,
    };
  },
});
