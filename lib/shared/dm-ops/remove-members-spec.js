// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMRemoveMembersOperation,
  dmRemoveMembersOperationValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMRemoveMembersOperation,
) {
  const { editorID, time, threadID, removedUserIDs, messageID } = dmOperation;
  const messageData = {
    type: messageTypes.REMOVE_MEMBERS,
    threadID,
    time,
    creatorID: editorID,
    removedUserIDs: [...removedUserIDs],
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

const removeMembersSpec: DMOperationSpec<DMRemoveMembersOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMRemoveMembersOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { time, threadID, removedUserIDs } = dmOperation;
      const { viewerID, threadInfos } = utilities;
      const threadInfo = threadInfos[threadID];

      const messageDataWithMessageInfos =
        createMessageDataWithInfoFromDMOperation(dmOperation);
      const { rawMessageInfo } = messageDataWithMessageInfos;
      const rawMessageInfos = [rawMessageInfo];

      const memberTimestamps = { ...threadInfo.timestamps.members };
      const removedUserIDsSet = new Set<string>();
      for (const userID of removedUserIDs) {
        if (!memberTimestamps[userID]) {
          memberTimestamps[userID] = {
            isMember: time,
            subscription: threadInfo.creationTime,
          };
        }

        if (memberTimestamps[userID].isMember > time) {
          continue;
        }

        memberTimestamps[userID] = {
          ...memberTimestamps[userID],
          isMember: time,
        };

        removedUserIDsSet.add(userID);
      }

      const viewerIsRemoved = removedUserIDsSet.has(viewerID);
      const updateInfos: Array<ClientUpdateInfo> = [];
      if (
        viewerIsRemoved &&
        (threadInfo.type !== threadTypes.THICK_SIDEBAR ||
          (threadInfo.parentThreadID &&
            !threadInfos[threadInfo.parentThreadID]))
      ) {
        updateInfos.push({
          type: updateTypes.DELETE_THREAD,
          id: uuid.v4(),
          time,
          threadID,
        });
      } else {
        const updatedThreadInfo = {
          ...threadInfo,
          members: threadInfo.members.filter(
            member => !removedUserIDsSet.has(member.id),
          ),
          timestamps: {
            ...threadInfo.timestamps,
            members: memberTimestamps,
          },
        };
        updateInfos.push({
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: updatedThreadInfo,
        });
      }

      const notificationsCreationData = {
        messageDatasWithMessageInfos: [messageDataWithMessageInfos],
      };

      return {
        rawMessageInfos,
        updateInfos,
        blobOps: [],
        notificationsCreationData,
      };
    },
    canBeProcessed: async (
      dmOperation: DMRemoveMembersOperation,
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
    supportsAutoRetry: true,
    operationValidator: dmRemoveMembersOperationValidator,
  });

export { removeMembersSpec };
