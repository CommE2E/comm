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
import { messageTruncationStatus } from '../../types/message-types.js';
import {
  type ThickRawThreadInfo,
  type RoleInfo,
  minimallyEncodeMemberInfo,
  minimallyEncodeRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import { joinThreadSubscription } from '../../types/subscription-types.js';
import type { ThreadPermissionsInfo } from '../../types/thread-permission-types.js';
import type { ThickThreadType } from '../../types/thread-types-enum.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { generatePendingThreadColor } from '../color-utils.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createRoleAndPermissionForThickThreads(
  threadType: ThickThreadType,
  threadID: string,
  roleID: string,
): { +role: RoleInfo, +membershipPermissions: ThreadPermissionsInfo } {
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
  return {
    membershipPermissions,
    role,
  };
}

type MutableThickRawThreadInfo = { ...ThickRawThreadInfo };
function createThickRawThreadInfo(
  input: CreateThickRawThreadInfoInput,
  viewerID: string,
): MutableThickRawThreadInfo {
  const {
    threadID,
    threadType,
    creationTime,
    parentThreadID,
    allMemberIDs,
    roleID,
    creatorID,
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

  const { membershipPermissions, role } =
    createRoleAndPermissionForThickThreads(threadType, threadID, roleID);

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

function createMessageDataFromDMOperation(
  dmOperation: DMCreateThreadOperation,
) {
  const { threadID, creatorID, time, threadType, memberIDs } = dmOperation;
  const allMemberIDs = [creatorID, ...memberIDs];
  const color = generatePendingThreadColor(allMemberIDs);
  return {
    type: messageTypes.CREATE_THREAD,
    threadID,
    creatorID,
    time,
    initialThreadState: {
      type: threadType,
      color,
      memberIDs: allMemberIDs,
    },
  };
}

const createThreadSpec: DMOperationSpec<DMCreateThreadOperation> =
  Object.freeze({
    notificationsCreationData: async (dmOperation: DMCreateThreadOperation) => {
      const messageData = createMessageDataFromDMOperation(dmOperation);
      return { messageDatas: [messageData] };
    },
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

      const rawThreadInfo = createThickRawThreadInfo(
        {
          threadID,
          threadType,
          creationTime: time,
          allMemberIDs,
          roleID,
          creatorID,
        },
        viewerID,
      );

      const messageData = createMessageDataFromDMOperation(dmOperation);
      const rawMessageInfos = [
        rawMessageInfoFromMessageData(messageData, newMessageID),
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
    canBeProcessed() {
      return { isProcessingPossible: true };
    },
    supportsAutoRetry: true,
  });

export {
  createThickRawThreadInfo,
  createThreadSpec,
  createRoleAndPermissionForThickThreads,
};
