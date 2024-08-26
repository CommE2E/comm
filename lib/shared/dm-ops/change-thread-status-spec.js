// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec';
import type { DMChangeThreadStatusOperation } from '../../types/dm-ops';
import { updateTypes } from '../../types/update-types-enum.js';

const changeThreadStatusSpec: DMOperationSpec<DMChangeThreadStatusOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMChangeThreadStatusOperation,
    ) => {
      const { threadID, unread } = dmOperation;
      if (unread) {
        return { badgeUpdateData: { threadID } };
      }
      return { rescindData: { threadID } };
    },
    processDMOperation: async (dmOperation: DMChangeThreadStatusOperation) => {
      const { threadID, unread, time } = dmOperation;
      const updateInfos = [
        {
          type: updateTypes.UPDATE_THREAD_READ_STATUS,
          id: uuid.v4(),
          time,
          threadID,
          unread,
        },
      ];
      return {
        rawMessageInfos: [],
        updateInfos,
      };
    },
    canBeProcessed(
      dmOperation: DMChangeThreadStatusOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) {
      const { creatorID, threadID } = dmOperation;
      if (viewerID !== creatorID) {
        return { isProcessingPossible: false, reason: { type: 'invalid' } };
      }

      if (!utilities.threadInfos[threadID]) {
        return {
          isProcessingPossible: false,
          reason: { type: 'missing_thread', threadID },
        };
      }

      return { isProcessingPossible: true };
    },
    supportsAutoRetry: true,
  });

export { changeThreadStatusSpec };
