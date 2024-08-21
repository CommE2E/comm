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
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { joinerID, time, messageID, existingThreadDetails } = dmOperation;

    const currentThreadInfo =
      utilities.threadInfos[existingThreadDetails.threadID];

    const messageData = createMessageDataFromDMOperation(dmOperation);
    const joinThreadMessageInfos = [
      rawMessageInfoFromMessageData(messageData, messageID),
    ];

    if (userIsMember(currentThreadInfo, joinerID)) {
      return {
        rawMessageInfos: joinThreadMessageInfos,
        updateInfos: [],
      };
    }

    const updateInfos: Array<ClientUpdateInfo> = [];
    const rawMessageInfos: Array<RawMessageInfo> = [];
    if (viewerID === joinerID) {
      const newThreadInfo = createThickRawThreadInfo(
        {
          ...existingThreadDetails,
          allMemberIDsWithSubscriptions: [
            ...existingThreadDetails.allMemberIDsWithSubscriptions,
            { id: joinerID, subscription: joinThreadSubscription },
          ],
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
      invariant(currentThreadInfo.thick, 'Thread should be thick');

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
  canBeProcessed(
    dmOperation: DMJoinThreadOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) {
    if (utilities.threadInfos[dmOperation.existingThreadDetails.threadID]) {
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
