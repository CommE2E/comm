// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { checkMessageIDConflict } from './dm-op-utils.js';
import type { DMSendTextMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMSendTextMessageOperation,
) {
  const { threadID, creatorID, time, text, messageID } = dmOperation;
  const messageData = {
    type: messageTypes.TEXT,
    threadID,
    creatorID,
    time,
    text,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

const sendTextMessageSpec: DMOperationSpec<DMSendTextMessageOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMSendTextMessageOperation,
    ) => {
      return {
        messageDatasWithMessageInfos: [
          createMessageDataWithInfoFromDMOperation(dmOperation),
        ],
      };
    },
    processDMOperation: async (dmOperation: DMSendTextMessageOperation) => {
      const { rawMessageInfo } =
        createMessageDataWithInfoFromDMOperation(dmOperation);
      const rawMessageInfos = [rawMessageInfo];
      const updateInfos: Array<ClientUpdateInfo> = [];
      return {
        rawMessageInfos,
        updateInfos,
        blobOps: [],
      };
    },
    canBeProcessed: async (
      dmOperation: DMSendTextMessageOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const conflictCheckResult = await checkMessageIDConflict(
        dmOperation,
        utilities,
      );
      if (!conflictCheckResult.isProcessingPossible) {
        return conflictCheckResult;
      }
      if (!utilities.threadInfos[dmOperation.threadID]) {
        return {
          isProcessingPossible: false,
          reason: {
            type: 'missing_thread',
            threadID: dmOperation.threadID,
          },
        };
      }
      return { isProcessingPossible: true };
    },
    supportsAutoRetry: false,
  });

export { sendTextMessageSpec };
