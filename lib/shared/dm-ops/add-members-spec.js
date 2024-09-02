// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import { createRoleAndPermissionForThickThreads } from './create-thread-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMAddMembersOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { AddMembersMessageData } from '../../types/messages/add-members.js';
import { minimallyEncodeMemberInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { joinThreadSubscription } from '../../types/subscription-types.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { values } from '../../utils/objects.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';
import { roleIsDefaultRole, userIsMember } from '../thread-utils.js';

function createAddNewMembersMessageDataFromDMOperation(
  dmOperation: DMAddMembersOperation,
): AddMembersMessageData {
  const { editorID, time, addedUserIDs, threadID } = dmOperation;
  return {
    type: messageTypes.ADD_MEMBERS,
    threadID,
    creatorID: editorID,
    time,
    addedUserIDs: [...addedUserIDs],
  };
}

const addMembersSpec: DMOperationSpec<DMAddMembersOperation> = Object.freeze({
  notificationsCreationData: async (dmOperation: DMAddMembersOperation) => {
    const messageData =
      createAddNewMembersMessageDataFromDMOperation(dmOperation);
    return { messageDatas: [messageData] };
  },
  processDMOperation: async (
    dmOperation: DMAddMembersOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { editorID, time, messageID, addedUserIDs, threadID } = dmOperation;
    const messageData =
      createAddNewMembersMessageDataFromDMOperation(dmOperation);
    const rawMessageInfos = [
      rawMessageInfoFromMessageData(messageData, messageID),
    ];
    const currentThreadInfo = utilities.threadInfos[threadID];
    if (!currentThreadInfo.thick) {
      return {
        rawMessageInfos: [],
        updateInfos: [],
      };
    }
    const defaultRoleID = values(currentThreadInfo.roles).find(role =>
      roleIsDefaultRole(role),
    )?.id;
    invariant(defaultRoleID, 'Default role ID must exist');
    const { membershipPermissions } = createRoleAndPermissionForThickThreads(
      currentThreadInfo.type,
      currentThreadInfo.id,
      defaultRoleID,
    );

    const memberTimestamps = { ...currentThreadInfo.timestamps.members };
    const newMembers = [];
    for (const userID of addedUserIDs) {
      if (!memberTimestamps[userID]) {
        memberTimestamps[userID] = {
          role: time,
          subscription: currentThreadInfo.creationTime,
        };
      }

      if (
        memberTimestamps[userID].role > time ||
        userIsMember(currentThreadInfo, userID)
      ) {
        continue;
      }

      memberTimestamps[userID] = {
        ...memberTimestamps[userID],
        role: time,
      };

      newMembers.push(
        minimallyEncodeMemberInfo<ThickMemberInfo>({
          id: userID,
          role: defaultRoleID,
          permissions: membershipPermissions,
          isSender: editorID === viewerID,
          subscription: joinThreadSubscription,
        }),
      );
    }

    const resultThreadInfo = {
      ...currentThreadInfo,
      members: [...currentThreadInfo.members, ...newMembers],
      timestamps: {
        ...currentThreadInfo.timestamps,
        members: memberTimestamps,
      },
    };
    const updateInfos = [
      {
        type: updateTypes.UPDATE_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: resultThreadInfo,
      },
    ];

    return {
      rawMessageInfos,
      updateInfos,
    };
  },
  canBeProcessed(
    dmOperation: DMAddMembersOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) {
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
});

export { addMembersSpec, createAddNewMembersMessageDataFromDMOperation };
