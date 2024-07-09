// @flow

import uuid from 'uuid';

import type { DMOperationSpec } from './dm-op-spec.js';
import type { DMSendTextMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const sendTextMessageSpec: DMOperationSpec<DMSendTextMessageOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMSendTextMessageOperation,
      viewerID: string,
    ) => {
      const { threadID, creatorID, time, text } = dmOperation;
      const textMessage = {
        type: messageTypes.TEXT,
        threadID,
        creatorID,
        time,
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
        rawMessageInfos: [textMessage],
        updateInfos,
      };
    },
  });

export { sendTextMessageSpec };
