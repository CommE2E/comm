// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import { createRoleAndPermissionForThickThreads } from './create-thread-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMJoinThreadOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { minimallyEncodeMemberInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { ThickRawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
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
    const {
      editorID,
      time,
      messageID,
      threadInfo,
      rawMessageInfos,
      truncationStatus,
      rawEntryInfos,
    } = dmOperation;

    const currentThreadInfoOptional = utilities.getThreadInfo(threadInfo.id);
    if (userIsMember(currentThreadInfoOptional, editorID)) {
      return {
        rawMessageInfos: [],
        updateInfos: [],
        userInfos: {},
      };
    }

    const joinThreadMessage = {
      type: messageTypes.JOIN_THREAD,
      id: messageID,
      threadID: threadInfo.id,
      creatorID: editorID,
      time,
    };

    const updateInfos: Array<ClientUpdateInfo> = [];
    if (viewerID === editorID) {
      updateInfos.push({
        type: updateTypes.JOIN_THREAD,
        id: uuid.v4(),
        time,
        threadInfo,
        rawMessageInfos,
        truncationStatus,
        rawEntryInfos,
      });
    } else {
      if (!currentThreadInfoOptional || !currentThreadInfoOptional.thick) {
        // We can't perform this operation now. It should be queued for later.
        return {
          rawMessageInfos: [],
          updateInfos: [],
          userInfos: {},
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

      const member = minimallyEncodeMemberInfo<ThickMemberInfo>({
        id: editorID,
        role: defaultRoleID,
        permissions: membershipPermissions,
        isSender: editorID === viewerID,
        subscription: joinThreadSubscription,
      });
      if (currentThreadInfo?.thick) {
        const updatedThreadInfo = {
          ...currentThreadInfo,
          members: [...threadInfo.members, member],
        };
        updateInfos.push({
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: updatedThreadInfo,
        });
      }
    }
    return {
      rawMessageInfos: [joinThreadMessage],
      updateInfos,
      userInfos: {},
    };
  },
});

export { joinThreadSpec };
