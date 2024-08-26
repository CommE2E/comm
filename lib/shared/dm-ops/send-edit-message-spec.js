// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMSendEditMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';

const sendEditMessageSpec: DMOperationSpec<DMSendEditMessageOperation> =
  Object.freeze({
    processDMOperation: async (dmOperation: DMSendEditMessageOperation) => {
      const { threadID, creatorID, time, messageID, targetMessageID, text } =
        dmOperation;
      const editMessage = {
        type: messageTypes.EDIT_MESSAGE,
        id: messageID,
        threadID,
        creatorID,
        time,
        targetMessageID,
        text,
      };

      return {
        rawMessageInfos: [editMessage],
        updateInfos: [],
      };
    },
    canBeProcessed(
      dmOperation: DMSendEditMessageOperation,
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
    supportsAutoRetry: true,
  });

export { sendEditMessageSpec };
