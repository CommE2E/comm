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
import { createRepliesCountUpdate } from './dm-op-utils.js';
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
import { roleIsDefaultRole, userIsMember } from '../thread-utils.js';

const joinThreadSpec: DMOperationSpec<DMJoinThreadOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMJoinThreadOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { joinerID, time, messageID, existingThreadDetails } = dmOperation;

    const currentThreadInfo =
      utilities.threadInfos[existingThreadDetails.threadID];

    const joinThreadMessage = {
      type: messageTypes.JOIN_THREAD,
      id: messageID,
      threadID: existingThreadDetails.threadID,
      creatorID: joinerID,
      time,
    };

    if (userIsMember(currentThreadInfo, joinerID)) {
      return {
        rawMessageInfos: [joinThreadMessage],
        updateInfos: [],
      };
    }

    const updateInfos: Array<ClientUpdateInfo> = [];
    const rawMessageInfos: Array<RawMessageInfo> = [];
    if (viewerID === joinerID) {
      const newThreadInfo = createThickRawThreadInfo(
        {
          ...existingThreadDetails,
          allMemberIDs: [...existingThreadDetails.allMemberIDs, joinerID],
        },
        viewerID,
      );
      updateInfos.push({
        type: updateTypes.JOIN_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: newThreadInfo,
        rawMessageInfos: [joinThreadMessage],
        truncationStatus: messageTruncationStatus.EXHAUSTIVE,
        rawEntryInfos: [],
      });
      const repliesCountUpdate = createRepliesCountUpdate(newThreadInfo, [
        joinThreadMessage,
      ]);
      if (repliesCountUpdate) {
        updateInfos.push(repliesCountUpdate);
      }
    } else {
      invariant(currentThreadInfo.thick, 'Thread should be thick');

      rawMessageInfos.push(joinThreadMessage);
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
      const updateWithRepliesCount = createRepliesCountUpdate(
        updatedThreadInfo,
        [joinThreadMessage],
      );
      updateInfos.push(
        updateWithRepliesCount ?? {
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: updatedThreadInfo,
        },
      );
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
});

export { joinThreadSpec };
