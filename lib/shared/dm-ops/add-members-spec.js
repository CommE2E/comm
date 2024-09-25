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
import type { RawMessageInfo } from '../../types/message-types.js';
import type { AddMembersMessageData } from '../../types/messages/add-members.js';
import { minimallyEncodeMemberInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { joinThreadSubscription } from '../../types/subscription-types.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { values } from '../../utils/objects.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';
import { roleIsDefaultRole, userIsMember } from '../thread-utils.js';

function createAddNewMembersMessageDataWithInfoFromDMOperation(
  dmOperation: DMAddMembersOperation,
): {
  +messageData: AddMembersMessageData,
  +rawMessageInfo: RawMessageInfo,
} {
  const { editorID, time, addedUserIDs, threadID, messageID } = dmOperation;
  const messageData = {
    type: messageTypes.ADD_MEMBERS,
    threadID,
    creatorID: editorID,
    time,
    addedUserIDs: [...addedUserIDs],
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

const addMembersSpec: DMOperationSpec<DMAddMembersOperation> = Object.freeze({
  notificationsCreationData: async (dmOperation: DMAddMembersOperation) => {
    return {
      messageDatasWithMessageInfos: [
        createAddNewMembersMessageDataWithInfoFromDMOperation(dmOperation),
      ],
    };
  },
  processDMOperation: async (
    dmOperation: DMAddMembersOperation,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { editorID, time, addedUserIDs, threadID } = dmOperation;
    const { viewerID, threadInfos } = utilities;

    const { rawMessageInfo } =
      createAddNewMembersMessageDataWithInfoFromDMOperation(dmOperation);
    const rawMessageInfos = [rawMessageInfo];

    const currentThreadInfo = threadInfos[threadID];
    if (!currentThreadInfo.thick) {
      return {
        rawMessageInfos: [],
        updateInfos: [],
        blobOps: [],
      };
    }

    const defaultRoleID = values(currentThreadInfo.roles).find(role =>
      roleIsDefaultRole(role),
    )?.id;
    invariant(defaultRoleID, 'Default role ID must exist');

    const parentThreadID = currentThreadInfo.parentThreadID;
    const parentThreadInfo = parentThreadID
      ? utilities.threadInfos[parentThreadID]
      : null;
    if (parentThreadID && !parentThreadInfo) {
      console.log(
        `Parent thread with ID ${parentThreadID} was expected while adding ` +
          'thread members but is missing from the store',
      );
    }
    invariant(
      !parentThreadInfo || parentThreadInfo.thick,
      'Parent thread should be thick',
    );

    const { membershipPermissions } = createRoleAndPermissionForThickThreads(
      currentThreadInfo.type,
      currentThreadInfo.id,
      defaultRoleID,
      parentThreadInfo,
    );

    const memberTimestamps = { ...currentThreadInfo.timestamps.members };
    const newMembers = [];
    for (const userID of addedUserIDs) {
      if (!memberTimestamps[userID]) {
        memberTimestamps[userID] = {
          isMember: time,
          subscription: currentThreadInfo.creationTime,
        };
      }

      if (memberTimestamps[userID].isMember > time) {
        continue;
      }

      memberTimestamps[userID] = {
        ...memberTimestamps[userID],
        isMember: time,
      };

      if (userIsMember(currentThreadInfo, userID)) {
        continue;
      }

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
      blobOps: [],
    };
  },
  canBeProcessed: async (
    dmOperation: DMAddMembersOperation,
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
});

export {
  addMembersSpec,
  createAddNewMembersMessageDataWithInfoFromDMOperation,
};
