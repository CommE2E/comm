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
import { type RawMessageInfo } from '../../types/message-types.js';
import {
  minimallyEncodeMemberInfo,
  type ThickRawThreadInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import { joinThreadSubscription } from '../../types/subscription-types.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';
import { roleIsDefaultRole, userIsMember } from '../thread-utils.js';

export type AddMembersResult = {
  rawMessageInfos: Array<RawMessageInfo>,
  updateInfos: Array<ClientUpdateInfo>,
  threadInfo: ?ThickRawThreadInfo,
};

function createAddNewMembersResults(
  dmOperation: DMAddMembersOperation,
  viewerID: string,
  utilities: ProcessDMOperationUtilities,
): AddMembersResult {
  const { editorID, time, messageID, addedUserIDs, threadID } = dmOperation;
  const addMembersMessage = {
    type: messageTypes.ADD_MEMBERS,
    id: messageID,
    threadID,
    creatorID: editorID,
    time,
    addedUserIDs: [...addedUserIDs],
  };

  const currentThreadInfo = utilities.threadInfos[threadID];
  if (!currentThreadInfo.thick) {
    return {
      rawMessageInfos: [],
      updateInfos: [],
      threadInfo: null,
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
  const newMembers = addedUserIDs
    .filter(userID => !userIsMember(currentThreadInfo, userID))
    .map(userID =>
      minimallyEncodeMemberInfo<ThickMemberInfo>({
        id: userID,
        role: defaultRoleID,
        permissions: membershipPermissions,
        isSender: editorID === viewerID,
        subscription: joinThreadSubscription,
      }),
    );

  const resultThreadInfo = {
    ...currentThreadInfo,
    members: [...currentThreadInfo.members, ...newMembers],
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
    rawMessageInfos: [addMembersMessage],
    updateInfos,
    threadInfo: resultThreadInfo,
  };
}

const addMembersSpec: DMOperationSpec<DMAddMembersOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMAddMembersOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { rawMessageInfos, updateInfos } = createAddNewMembersResults(
      dmOperation,
      viewerID,
      utilities,
    );
    return { rawMessageInfos, updateInfos };
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
});

export { addMembersSpec, createAddNewMembersResults };
