// @flow

import type { UpdateRelationshipMessageData } from '../../types/message/update-relationship';
import type { MessageSpec } from './message-spec';

export const updateRelationshipMessageSpec: MessageSpec<UpdateRelationshipMessageData> = Object.freeze(
  {
    messageContent(data) {
      return JSON.stringify({
        operation: data.operation,
        targetID: data.targetID,
      });
    },
  },
);
