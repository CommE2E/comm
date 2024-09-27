// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMChangeThreadReadStatusOperation,
  dmChangeThreadReadStatusOperationValidator,
} from '../../types/dm-ops.js';
import { updateTypes } from '../../types/update-types-enum.js';

const changeThreadReadStatusSpec: DMOperationSpec<DMChangeThreadReadStatusOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMChangeThreadReadStatusOperation,
    ) => {
      const { threadID, unread } = dmOperation;
      if (unread) {
        return { badgeUpdateData: { threadID } };
      }
      return { rescindData: { threadID } };
    },
    processDMOperation: async (
      dmOperation: DMChangeThreadReadStatusOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { threadID, unread, time } = dmOperation;

      const threadInfo = utilities.threadInfos[threadID];
      invariant(threadInfo.thick, 'Thread should be thick');
      if (threadInfo.timestamps.currentUser.unread > time) {
        return {
          rawMessageInfos: [],
          updateInfos: [],
          blobOps: [],
        };
      }

      const updateInfos = [
        {
          type: updateTypes.UPDATE_THREAD_READ_STATUS,
          id: uuid.v4(),
          time,
          threadID: threadInfo.id,
          unread,
        },
      ];
      return {
        rawMessageInfos: [],
        updateInfos,
        blobOps: [],
      };
    },
    canBeProcessed: async (
      dmOperation: DMChangeThreadReadStatusOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { creatorID, threadID } = dmOperation;
      const { threadInfos, viewerID } = utilities;
      if (viewerID !== creatorID) {
        return { isProcessingPossible: false, reason: { type: 'invalid' } };
      }

      if (!threadInfos[threadID]) {
        return {
          isProcessingPossible: false,
          reason: { type: 'missing_thread', threadID },
        };
      }

      return { isProcessingPossible: true };
    },
    supportsAutoRetry: true,
    operationValidator: dmChangeThreadReadStatusOperationValidator,
  });

export { changeThreadReadStatusSpec };
