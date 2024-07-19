// @flow

import uuid from 'uuid';

import type { DMOperationSpec } from './dm-op-spec.js';
import type { DMSendReactionMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const sendReactionMessageSpec: DMOperationSpec<DMSendReactionMessageOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMSendReactionMessageOperation,
      viewerID: string,
    ) => {
      const {
        threadID,
        creatorID,
        time,
        messageID,
        targetMessageID,
        reaction,
        action,
      } = dmOperation;
      const reactionMessage = {
        type: messageTypes.REACTION,
        id: messageID,
        threadID,
        creatorID,
        time,
        targetMessageID,
        reaction,
        action,
      };

      const updateInfos: Array<ClientUpdateInfo> = [];
      if (creatorID !== viewerID) {
        updateInfos.push({
          type: updateTypes.UPDATE_THREAD_READ_STATUS,
          id: uuid.v4(),
          time,
          threadID,
          unread: true,
        });
      }
      return {
        rawMessageInfos: [reactionMessage],
        updateInfos,
      };
    },
  });

export { sendReactionMessageSpec };
