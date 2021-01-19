// @flow

import { messageTypes } from '../../types/message-types';
import type {
  RawUpdateRelationshipMessageInfo,
  UpdateRelationshipMessageData,
  UpdateRelationshipMessageInfo,
} from '../../types/message/update-relationship';
import type { MessageSpec } from './message-spec';

export const updateRelationshipMessageSpec: MessageSpec<
  UpdateRelationshipMessageData,
  RawUpdateRelationshipMessageInfo,
  UpdateRelationshipMessageInfo,
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

  createMessageInfo(rawMessageInfo, creator, params) {
    const target = params.createRelativeUserInfos([rawMessageInfo.targetID])[0];
    if (!target) {
      return null;
    }
    return {
      type: messageTypes.UPDATE_RELATIONSHIP,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      target,
      time: rawMessageInfo.time,
      operation: rawMessageInfo.operation,
    };
  },
});
