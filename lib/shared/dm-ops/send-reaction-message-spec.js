// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMSendReactionMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';

const sendReactionMessageSpec: DMOperationSpec<DMSendReactionMessageOperation> =
  Object.freeze({
    processDMOperation: async (dmOperation: DMSendReactionMessageOperation) => {
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

      return {
        rawMessageInfos: [reactionMessage],
        updateInfos: [],
      };
    },
    canBeProcessed(
      dmOperation: DMSendReactionMessageOperation,
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

export { sendReactionMessageSpec };
