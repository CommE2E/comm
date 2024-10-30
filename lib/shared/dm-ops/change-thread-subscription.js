// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  ProcessDMOperationUtilities,
  DMOperationSpec,
} from './dm-op-spec.js';
import {
  type DMChangeThreadSubscriptionOperation,
  dmChangeThreadSubscriptionOperationValidator,
} from '../../types/dm-ops.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const changeThreadSubscriptionSpec: DMOperationSpec<DMChangeThreadSubscriptionOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMChangeThreadSubscriptionOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { creatorID, threadID, subscription, time } = dmOperation;
      const { viewerID, threadInfos } = utilities;

      const threadInfo = threadInfos[threadID];

      if (threadInfo.timestamps.members[creatorID].subscription > time) {
        return {
          updateInfos: [],
          rawMessageInfos: [],
          blobOps: [],
          notificationsCreationData: null,
        };
      }

      const creatorMemberInfo = threadInfo.members.find(
        member => member.id === creatorID,
      );
      invariant(creatorMemberInfo, 'operation creator missing in thread');
      const updatedCreatorMemberInfo = {
        ...creatorMemberInfo,
        subscription,
      };
      const otherMemberInfos = threadInfo.members.filter(
        member => member.id !== creatorID,
      );
      const membersUpdate = [...otherMemberInfos, updatedCreatorMemberInfo];
      const currentUserUpdate =
        viewerID === creatorID
          ? {
              ...threadInfo.currentUser,
              subscription,
            }
          : threadInfo.currentUser;

      const threadInfoUpdate = {
        ...threadInfo,
        members: membersUpdate,
        currentUser: currentUserUpdate,
        timestamps: {
          ...threadInfo.timestamps,
          members: {
            ...threadInfo.timestamps.members,
            [creatorID]: {
              ...threadInfo.timestamps.members[creatorID],
              subscription: time,
            },
          },
        },
      };

      const updateInfos: Array<ClientUpdateInfo> = [
        {
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: threadInfoUpdate,
        },
      ];

      return {
        updateInfos,
        rawMessageInfos: [],
        blobOps: [],
        notificationsCreationData: null,
      };
    },
    canBeProcessed: async (
      dmOperation: DMChangeThreadSubscriptionOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { threadID, creatorID } = dmOperation;
      if (!utilities.threadInfos[threadID]) {
        return {
          isProcessingPossible: false,
          reason: { type: 'missing_thread', threadID },
        };
      }

      if (
        !utilities.threadInfos[threadID].members.find(
          memberInfo => memberInfo.id === creatorID,
        )
      ) {
        return {
          isProcessingPossible: false,
          reason: { type: 'missing_membership', threadID, userID: creatorID },
        };
      }

      return { isProcessingPossible: true };
    },
    supportsAutoRetry: true,
    operationValidator: dmChangeThreadSubscriptionOperationValidator,
  });

export { changeThreadSubscriptionSpec };
