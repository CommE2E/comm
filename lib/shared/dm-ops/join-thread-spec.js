// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import {
  createRoleAndPermissionForThickThreads,
  createThickRawThreadInfo,
} from './create-thread-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMJoinThreadOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import {
  messageTruncationStatus,
  type RawMessageInfo,
} from '../../types/message-types.js';
import { minimallyEncodeMemberInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { joinThreadSubscription } from '../../types/subscription-types.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';
import { roleIsDefaultRole, userIsMember } from '../thread-utils.js';

function createMessageDataFromDMOperation(dmOperation: DMJoinThreadOperation) {
  const { joinerID, time, existingThreadDetails } = dmOperation;
  return {
    type: messageTypes.JOIN_THREAD,
    threadID: existingThreadDetails.threadID,
    creatorID: joinerID,
    time,
  };
}

const joinThreadSpec: DMOperationSpec<DMJoinThreadOperation> = Object.freeze({
  notificationsCreationData: async (dmOperation: DMJoinThreadOperation) => {
    const messageData = createMessageDataFromDMOperation(dmOperation);
    return { messageDatas: [messageData] };
  },
  processDMOperation: async (
    dmOperation: DMJoinThreadOperation,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { joinerID, time, messageID, existingThreadDetails } = dmOperation;
    const { viewerID, threadInfos } = utilities;

    const currentThreadInfo = threadInfos[existingThreadDetails.threadID];
    if (currentThreadInfo && !currentThreadInfo.thick) {
      return {
        rawMessageInfos: [],
        updateInfos: [],
      };
    }

    const messageData = createMessageDataFromDMOperation(dmOperation);
    const joinThreadMessageInfos = [
      rawMessageInfoFromMessageData(messageData, messageID),
    ];

    const memberTimestamps = { ...currentThreadInfo?.timestamps?.members };
    if (!memberTimestamps[joinerID]) {
      memberTimestamps[joinerID] = {
        isMember: time,
        subscription: existingThreadDetails.creationTime,
      };
    }

    if (memberTimestamps[joinerID].isMember > time) {
      return {
        rawMessageInfos: joinThreadMessageInfos,
        updateInfos: [],
      };
    }

    memberTimestamps[joinerID] = {
      ...memberTimestamps[joinerID],
      isMember: time,
    };

    const updateInfos: Array<ClientUpdateInfo> = [];
    const rawMessageInfos: Array<RawMessageInfo> = [];

    if (userIsMember(currentThreadInfo, joinerID)) {
      rawMessageInfos.push(...joinThreadMessageInfos);
      updateInfos.push({
        type: updateTypes.UPDATE_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: {
          ...currentThreadInfo,
          timestamps: {
            ...currentThreadInfo.timestamps,
            members: memberTimestamps,
          },
        },
      });
    } else if (viewerID === joinerID) {
      const newThreadInfo = createThickRawThreadInfo(
        {
          ...existingThreadDetails,
          allMemberIDsWithSubscriptions: [
            ...existingThreadDetails.allMemberIDsWithSubscriptions,
            { id: joinerID, subscription: joinThreadSubscription },
          ],
          timestamps: {
            ...existingThreadDetails.timestamps,
            members: memberTimestamps,
          },
        },
        viewerID,
      );
      updateInfos.push({
        type: updateTypes.JOIN_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: newThreadInfo,
        rawMessageInfos: joinThreadMessageInfos,
        truncationStatus: messageTruncationStatus.EXHAUSTIVE,
        rawEntryInfos: [],
      });
    } else {
      rawMessageInfos.push(...joinThreadMessageInfos);
      const defaultRoleID = values(currentThreadInfo.roles).find(role =>
        roleIsDefaultRole(role),
      )?.id;
      invariant(defaultRoleID, 'Default role ID must exist');
      const { membershipPermissions } = createRoleAndPermissionForThickThreads(
        currentThreadInfo.type,
        currentThreadInfo.id,
        defaultRoleID,
      );

      const member = minimallyEncodeMemberInfo<ThickMemberInfo>({
        id: joinerID,
        role: defaultRoleID,
        permissions: membershipPermissions,
        isSender: joinerID === viewerID,
        subscription: joinThreadSubscription,
      });
      const updatedThreadInfo = {
        ...currentThreadInfo,
        members: [...currentThreadInfo.members, member],
        timestamps: {
          ...currentThreadInfo.timestamps,
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
    return {
      rawMessageInfos,
      updateInfos,
    };
  },
  canBeProcessed: async (
    dmOperation: DMJoinThreadOperation,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { viewerID, threadInfos } = utilities;
    if (
      threadInfos[dmOperation.existingThreadDetails.threadID] ||
      dmOperation.joinerID === viewerID
    ) {
      return { isProcessingPossible: true };
    }
    return {
      isProcessingPossible: false,
      reason: {
        type: 'missing_thread',
        threadID: dmOperation.existingThreadDetails.threadID,
      },
    };
  },
  supportsAutoRetry: true,
});

export { joinThreadSpec };
