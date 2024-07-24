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

const joinThreadSpec: DMOperationSpec<DMJoinThreadOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMJoinThreadOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { editorID, time, messageID, existingThreadDetails } = dmOperation;

    const joinThreadMessage = {
      type: messageTypes.JOIN_THREAD,
      id: messageID,
      threadID: existingThreadDetails.threadID,
      creatorID: editorID,
      time,
    };

    const currentThreadInfoOptional =
      utilities.threadInfos[existingThreadDetails.threadID];
    if (userIsMember(currentThreadInfoOptional, editorID)) {
      return {
        rawMessageInfos: [joinThreadMessage],
        updateInfos: [
          {
            type: updateTypes.UPDATE_THREAD_READ_STATUS,
            id: uuid.v4(),
            time,
            threadID: existingThreadDetails.threadID,
            unread: true,
          },
        ],
      };
    }

    const updateInfos: Array<ClientUpdateInfo> = [];
    const rawMessageInfos: Array<RawMessageInfo> = [];
    if (viewerID === editorID) {
      updateInfos.push(
        {
          type: updateTypes.JOIN_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: createThickRawThreadInfo(
            {
              ...existingThreadDetails,
              allMemberIDs: [...existingThreadDetails.allMemberIDs, editorID],
            },
            viewerID,
          ),
          rawMessageInfos: [joinThreadMessage],
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
      if (!currentThreadInfoOptional || !currentThreadInfoOptional.thick) {
        // We can't perform this operation now. It should be queued for later.
        return {
          rawMessageInfos: [],
          updateInfos: [],
        };
      }
      const currentThreadInfo: ThickRawThreadInfo = currentThreadInfoOptional;

      rawMessageInfos.push(joinThreadMessage);
      if (!userIsMember(currentThreadInfo, editorID)) {
        const defaultRoleID = values(currentThreadInfo.roles).find(role =>
          roleIsDefaultRole(role),
        )?.id;
        invariant(defaultRoleID, 'Default role ID must exist');
        const { membershipPermissions } =
          createRoleAndPermissionForThickThreads(
            currentThreadInfo.type,
            currentThreadInfo.id,
            defaultRoleID,
          );

        const member = minimallyEncodeMemberInfo<ThickMemberInfo>({
          id: editorID,
          role: defaultRoleID,
          permissions: membershipPermissions,
          isSender: editorID === viewerID,
          subscription: joinThreadSubscription,
        });
        const updatedThreadInfo = {
          ...currentThreadInfo,
          members: [...currentThreadInfo.members, member],
        };
        updateInfos.push(
          {
            type: updateTypes.UPDATE_THREAD,
            id: uuid.v4(),
            time,
            threadInfo: updatedThreadInfo,
          },
          {
            type: updateTypes.UPDATE_THREAD_READ_STATUS,
            id: uuid.v4(),
            time,
            threadID: existingThreadDetails.threadID,
            unread: true,
          },
        );
      }
    }
    return {
      rawMessageInfos,
      updateInfos,
    };
  },
});

export { joinThreadSpec };