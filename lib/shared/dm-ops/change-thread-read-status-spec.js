// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec';
import type { DMChangeThreadReadStatusOperation } from '../../types/dm-ops';
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
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { threadID, unread, time } = dmOperation;

      const threadInfo = utilities.threadInfos[threadID];
      invariant(threadInfo.thick, 'Thread should be thick');
      if (threadInfo.timestamps.currentUser.unread > time) {
        return {
          rawMessageInfos: [],
          updateInfos: [],
        };
      }

      const updateInfos = [
        {
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: {
            ...threadInfo,
            currentUser: {
              ...threadInfo.currentUser,
              unread,
            },
            timestamps: {
              ...threadInfo.timestamps,
              currentUser: {
                ...threadInfo.timestamps.currentUser,
                unread: time,
              },
            },
          },
        },
      ];
      return {
        rawMessageInfos: [],
        updateInfos,
      };
    },
    canBeProcessed: async (
      dmOperation: DMChangeThreadReadStatusOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
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
