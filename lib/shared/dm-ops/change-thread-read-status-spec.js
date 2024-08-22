// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec';
import type { DMChangeThreadReadStatusOperation } from '../../types/dm-ops';
import { updateTypes } from '../../types/update-types-enum.js';

const changeThreadReadStatusSpec: DMOperationSpec<DMChangeThreadReadStatusOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMChangeThreadReadStatusOperation,
    ) => {
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
      dmOperation: DMChangeThreadReadStatusOperation,
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

export { changeThreadReadStatusSpec };
