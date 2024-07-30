// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { createUpdateUnreadCountUpdate } from './dm-op-utils.js';
import type { DMSendTextMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const sendTextMessageSpec: DMOperationSpec<DMSendTextMessageOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMSendTextMessageOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { threadID, creatorID, time, messageID, text } = dmOperation;
      const textMessage = {
        type: messageTypes.TEXT,
        id: messageID,
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
      const threadInfo = utilities.threadInfos[threadID];
      const repliesCountUpdate = createUpdateUnreadCountUpdate(threadInfo, [
        textMessage,
      ]);
      if (repliesCountUpdate) {
        updateInfos.push(repliesCountUpdate);
      }
      return {
        rawMessageInfos: [textMessage],
        updateInfos,
      };
    },
    canBeApplied(
      dmOperation: DMSendTextMessageOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) {
      return !!utilities.threadInfos[dmOperation.threadID];
    },
  });

export { sendTextMessageSpec };
