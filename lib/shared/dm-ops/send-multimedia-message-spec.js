// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMSendMultimediaMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMSendMultimediaMessageOperation,
) {
  const { threadID, creatorID, time, media, messageID } = dmOperation;
  const messageData = {
    type: messageTypes.MULTIMEDIA,
    threadID,
    creatorID,
    time,
    media,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

const sendMultimediaMessageSpec: DMOperationSpec<DMSendMultimediaMessageOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMSendMultimediaMessageOperation,
    ) => {
      return {
        messageDatasWithMessageInfos: [
          createMessageDataWithInfoFromDMOperation(dmOperation),
        ],
      };
    },
    processDMOperation: async (
      dmOperation: DMSendMultimediaMessageOperation,
    ) => {
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
      dmOperation: DMSendMultimediaMessageOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
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
    supportsAutoRetry: false,
  });

export { sendMultimediaMessageSpec };
