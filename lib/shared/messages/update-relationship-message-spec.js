// @flow

import { messageTypes } from '../../types/message-types';
import type {
  RawUpdateRelationshipMessageInfo,
  UpdateRelationshipMessageData,
} from '../../types/message/update-relationship';
import type { MessageSpec } from './message-spec';

export const updateRelationshipMessageSpec: MessageSpec<
  UpdateRelationshipMessageData,
  RawUpdateRelationshipMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify({
      operation: data.operation,
      targetID: data.targetID,
    });
  },

  rawMessageInfoFromRow(row) {
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.UPDATE_RELATIONSHIP,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      targetID: content.targetID,
      operation: content.operation,
    };
  },
});
