// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { createRepliesCountUpdate } from './dm-op-utils.js';
import type { DMSendTextMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
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
      const threadInfo = utilities.threadInfos[threadID];
      const repliesCountUpdate = createRepliesCountUpdate(threadInfo, [
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
    canBeProcessed(
      dmOperation: DMSendTextMessageOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) {
      if (utilities.threadInfos[dmOperation.threadID]) {
        return { isProcessingPossible: true };
      }
      return {
        isProcessingPossible: false,
        reason: {
          type: 'missing_thread',
          threadID: dmOperation.threadID,
        },
      };
    },
  });

export { sendTextMessageSpec };
