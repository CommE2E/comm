// @flow

import uuid from 'uuid';

import type { DMOperationSpec } from './dm-op-spec.js';
import { specialRoles } from '../../permissions/special-roles.js';
import {
  getAllThreadPermissions,
  makePermissionsBlob,
  getThickThreadRolePermissionsBlob,
} from '../../permissions/thread-permissions.js';
import type {
  CreateThickRawThreadInfoInput,
  DMCreateThreadOperation,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import {
  type RawMessageInfo,
  messageTruncationStatus,
} from '../../types/message-types.js';
import {
  type ThickRawThreadInfo,
  type RoleInfo,
  minimallyEncodeMemberInfo,
  minimallyEncodeRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import { joinThreadSubscription } from '../../types/subscription-types.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { generatePendingThreadColor } from '../color-utils.js';

type MutableThickRawThreadInfo = { ...ThickRawThreadInfo };
function createThickRawThreadInfo(
  input: CreateThickRawThreadInfoInput,
): MutableThickRawThreadInfo {
  const {
    threadID,
    threadType,
    creationTime,
    parentThreadID,
    allMemberIDs,
    roleID,
    creatorID,
    viewerID,
    name,
    avatar,
    description,
    color,
    containingThreadID,
    sourceMessageID,
    repliesCount,
    pinnedCount,
  } = input;

  const threadColor = color ?? generatePendingThreadColor(allMemberIDs);

  const rolePermissions = getThickThreadRolePermissionsBlob(threadType);
  const membershipPermissions = getAllThreadPermissions(
    makePermissionsBlob(rolePermissions, null, threadID, threadType),
    threadID,
  );
  const role: RoleInfo = {
    ...minimallyEncodeRoleInfo({
      id: roleID,
      name: 'Members',
      permissions: rolePermissions,
      isDefault: true,
    }),
    specialRole: specialRoles.DEFAULT_ROLE,
  };

  const newThread: MutableThickRawThreadInfo = {
    thick: true,
    minimallyEncoded: true,
    id: threadID,
    type: threadType,
    color: threadColor,
    creationTime,
    parentThreadID,
    members: allMemberIDs.map(memberID =>
      minimallyEncodeMemberInfo<ThickMemberInfo>({
        id: memberID,
        role: role.id,
        permissions: membershipPermissions,
        isSender: memberID === viewerID,
        subscription: joinThreadSubscription,
      }),
    ),
    roles: {
      [role.id]: role,
    },
    currentUser: minimallyEncodeThreadCurrentUserInfo({
      role: role.id,
      permissions: membershipPermissions,
      subscription: joinThreadSubscription,
      unread: creatorID !== viewerID,
    }),
    repliesCount: repliesCount ?? 0,
    name,
    avatar,
    description,
    containingThreadID,
  };
  if (sourceMessageID) {
    newThread.sourceMessageID = sourceMessageID;
  }
  if (pinnedCount) {
    newThread.pinnedCount = pinnedCount;
  }
  return newThread;
}

const createThreadSpec: DMOperationSpec<DMCreateThreadOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMCreateThreadOperation,
      viewerID: string,
    ) => {
      const {
        threadID,
        creatorID,
        time,
        threadType,
        memberIDs,
        roleID,
        newMessageID,
      } = dmOperation;
      const allMemberIDs = [creatorID, ...memberIDs];

      const rawThreadInfo = createThickRawThreadInfo({
        threadID,
        threadType,
        creationTime: time,
        allMemberIDs,
        roleID,
        creatorID,
        viewerID,
      });

      const rawMessageInfos: Array<RawMessageInfo> = [
        {
          type: messageTypes.CREATE_THREAD,
          id: newMessageID,
          threadID,
          creatorID,
          time,
          initialThreadState: {
            type: threadType,
            color: rawThreadInfo.color,
            memberIDs: allMemberIDs,
          },
        },
      ];

      const threadJoinUpdateInfo = {
        type: updateTypes.JOIN_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: rawThreadInfo,
        rawMessageInfos,
        truncationStatus: messageTruncationStatus.EXHAUSTIVE,
        rawEntryInfos: [],
      };

      return {
        rawMessageInfos: [], // included in updateInfos below
        updateInfos: [threadJoinUpdateInfo],
      };
    },
  });

export { createThickRawThreadInfo, createThreadSpec };
