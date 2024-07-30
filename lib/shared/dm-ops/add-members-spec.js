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
import { createUpdateUnreadCountUpdate } from './dm-op-utils.js';
import type { DMAddMembersOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import {
  messageTruncationStatus,
  type RawMessageInfo,
} from '../../types/message-types.js';
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

function createAddNewMembersResults(
  dmOperation: DMAddMembersOperation,
  viewerID: string,
  utilities: ProcessDMOperationUtilities,
): {
  +rawMessageInfos: Array<RawMessageInfo>,
  +updateInfos: Array<ClientUpdateInfo>,
  +threadInfo: ?ThickRawThreadInfo,
} {
  const { editorID, time, messageID, addedUserIDs, existingThreadDetails } =
    dmOperation;
  const addMembersMessage = {
    type: messageTypes.ADD_MEMBERS,
    id: messageID,
    threadID: existingThreadDetails.threadID,
    creatorID: editorID,
    time,
    addedUserIDs: [...addedUserIDs],
  };

  const viewerIsAdded = addedUserIDs.includes(viewerID);
  const updateInfos: Array<ClientUpdateInfo> = [];
  const rawMessageInfos: Array<RawMessageInfo> = [];
  let resultThreadInfo: ?ThickRawThreadInfo;
  if (viewerIsAdded) {
    const newThread = createThickRawThreadInfo(
      {
        ...existingThreadDetails,
        allMemberIDs: [...existingThreadDetails.allMemberIDs, ...addedUserIDs],
      },
      viewerID,
    );
    resultThreadInfo = newThread;
    updateInfos.push(
      {
        type: updateTypes.JOIN_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: newThread,
        rawMessageInfos: [addMembersMessage],
        truncationStatus: messageTruncationStatus.EXHAUSTIVE,
        rawEntryInfos: [],
      },
      {
        type: updateTypes.UPDATE_THREAD_READ_STATUS,
        id: uuid.v4(),
        time,
        threadID: existingThreadDetails.threadID,
        unread: true,
      },
    );
    const repliesCountUpdate = createUpdateUnreadCountUpdate(newThread, [
      addMembersMessage,
    ]);
    if (
      repliesCountUpdate &&
      repliesCountUpdate.type === updateTypes.UPDATE_THREAD
    ) {
      updateInfos.push(repliesCountUpdate);
      resultThreadInfo.repliesCount =
        repliesCountUpdate.threadInfo.repliesCount;
    }
  } else {
    const currentThreadInfoOptional =
      utilities.threadInfos[existingThreadDetails.threadID];
    if (!currentThreadInfoOptional || !currentThreadInfoOptional.thick) {
      // We can't perform this operation now. It should be queued for later.
      return {
        rawMessageInfos: [],
        updateInfos: [],
        threadInfo: null,
      };
    }
    const currentThreadInfo: ThickRawThreadInfo = currentThreadInfoOptional;
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

    const newThreadInfo = {
      ...currentThreadInfo,
      members: [...currentThreadInfo.members, ...newMembers],
    };
    resultThreadInfo = newThreadInfo;
    const updateWithRepliesCount = createUpdateUnreadCountUpdate(
      newThreadInfo,
      [addMembersMessage],
    );
    updateInfos.push(
      updateWithRepliesCount ?? {
        type: updateTypes.UPDATE_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: newThreadInfo,
      },
      {
        type: updateTypes.UPDATE_THREAD_READ_STATUS,
        id: uuid.v4(),
        time,
        threadID: existingThreadDetails.threadID,
        unread: true,
      },
    );
    rawMessageInfos.push(addMembersMessage);
  }
  return {
    rawMessageInfos,
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
    if (
      utilities.threadInfos[dmOperation.existingThreadDetails.threadID] ||
      dmOperation.addedUserIDs.includes(viewerID)
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
});

export { addMembersSpec, createAddNewMembersResults };
