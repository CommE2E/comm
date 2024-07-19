// @flow

import uuid from 'uuid';

import type { DMOperationSpec } from './dm-op-spec.js';
import type { DMSendEditMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const sendEditMessageSpec: DMOperationSpec<DMSendEditMessageOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMSendEditMessageOperation,
      viewerID: string,
    ) => {
      const { threadID, creatorID, time, messageID, targetMessageID, text } =
        dmOperation;
      const reactionMessage = {
        type: messageTypes.EDIT_MESSAGE,
        id: messageID,
        threadID,
        creatorID,
        time,
        targetMessageID,
        text,
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

export { sendEditMessageSpec };
