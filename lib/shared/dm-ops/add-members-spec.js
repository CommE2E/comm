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
import type { DMAddMembersOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { messageTruncationStatus } from '../../types/message-types.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { ThickRawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { minimallyEncodeMemberInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { joinThreadSubscription } from '../../types/subscription-types.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';
import { roleIsDefaultRole, userIsMember } from '../thread-utils.js';

const addMembersSpec: DMOperationSpec<DMAddMembersOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMAddMembersOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
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
    if (viewerIsAdded) {
      const newThread = createThickRawThreadInfo(
        {
          ...existingThreadDetails,
          allMemberIDs: [
            ...existingThreadDetails.allMemberIDs,
            ...addedUserIDs,
          ],
        },
        viewerID,
      );
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
    } else {
      const currentThreadInfoOptional = utilities.getThreadInfo(
        existingThreadDetails.threadID,
      );
      if (!currentThreadInfoOptional || !currentThreadInfoOptional.thick) {
        // We can't perform this operation now. It should be queued for later.
        return {
          rawMessageInfos: [],
          updateInfos: [],
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
      updateInfos.push(
        {
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
    };
  },
});

export { addMembersSpec };
