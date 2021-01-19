// @flow

import invariant from 'invariant';

import type {
  RawSidebarSourceMessageInfo,
  SidebarSourceMessageData,
} from '../../types/message-types';
import { messageTypes } from '../../types/message-types';
import type { MessageSpec } from './message-spec';

export const sidebarSourceMessageSpec: MessageSpec<
  SidebarSourceMessageData,
  RawSidebarSourceMessageInfo,
> = Object.freeze({
  messageContent(data) {
    const sourceMessageID = data.sourceMessage?.id;
    invariant(sourceMessageID, 'Source message id should be set');
    return JSON.stringify({
      sourceMessageID,
    });
  },

  rawMessageInfoFromRow(row, params) {
    const { derivedMessages } = params;
    invariant(derivedMessages, 'Derived messages should be provided');

    const content = JSON.parse(row.content);
    const sourceMessage = derivedMessages.get(content.sourceMessageID);
    if (!sourceMessage) {
      console.warn(
        `Message with id ${row.id} has a derived message ` +
          `${content.sourceMessageID} which is not present in the database`,
      );
    }
    return {
      type: messageTypes.SIDEBAR_SOURCE,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      sourceMessage,
    };
  },
});
