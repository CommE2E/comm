// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  ProcessDMOperationUtilities,
  DMOperationSpec,
} from './dm-op-spec.js';
import type { DMChangeThreadSubscriptionOperation } from '../../types/dm-ops.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const changeThreadSubscriptionSpec: DMOperationSpec<DMChangeThreadSubscriptionOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMChangeThreadSubscriptionOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { creatorID, threadID, subscription, time } = dmOperation;

      const threadInfo = utilities.threadInfos[threadID];
      invariant(threadInfo.thick, 'Thread should be thick');

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
      const currentUserUpdate = {
        ...threadInfo.currentUser,
        subscription,
      };

      const threadInfoUpdate = {
        ...threadInfo,
        members: membersUpdate,
        currentUser: currentUserUpdate,
      };

      const updateInfos: Array<ClientUpdateInfo> = [
        {
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: threadInfoUpdate,
        },
      ];

      return { updateInfos, rawMessageInfos: [] };
    },
    canBeProcessed(
      dmOperation: DMChangeThreadSubscriptionOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) {
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
        return { isProcessingPossible: false, reason: { type: 'invalid' } };
      }

      return { isProcessingPossible: true };
    },
    supportsAutoRetry: true,
  });

export { changeThreadSubscriptionSpec };
