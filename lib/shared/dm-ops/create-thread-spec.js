// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { specialRoles } from '../../permissions/special-roles.js';
import {
  getAllThreadPermissions,
  makePermissionsBlob,
  getThickThreadRolePermissionsBlob,
  makePermissionsForChildrenBlob,
} from '../../permissions/thread-permissions.js';
import {
  type CreateThickRawThreadInfoInput,
  type DMCreateThreadOperation,
  dmCreateThreadOperationValidator,
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
import { createThreadTimestamps } from '../thread-utils.js';

function createPermissionsInfo(
  threadID: string,
  threadType: ThickThreadType,
  isMember: boolean,
  parentThreadInfo: ?ThickRawThreadInfo,
): ThreadPermissionsInfo {
  let rolePermissions = null;
  if (isMember) {
    rolePermissions = getThickThreadRolePermissionsBlob(threadType);
  }

  let permissionsFromParent = null;
  if (parentThreadInfo) {
    const parentThreadRolePermissions = getThickThreadRolePermissionsBlob(
      parentThreadInfo.type,
    );
    const parentPermissionsBlob = makePermissionsBlob(
      parentThreadRolePermissions,
      null,
      parentThreadInfo.id,
      parentThreadInfo.type,
    );
    permissionsFromParent = makePermissionsForChildrenBlob(
      parentPermissionsBlob,
    );
  }

  return getAllThreadPermissions(
    makePermissionsBlob(
      rolePermissions,
      permissionsFromParent,
      threadID,
      threadType,
    ),
    threadID,
  );
}

function createRoleAndPermissionForThickThreads(
  threadType: ThickThreadType,
  threadID: string,
  roleID: string,
  parentThreadInfo: ?ThickRawThreadInfo,
): { +role: RoleInfo, +membershipPermissions: ThreadPermissionsInfo } {
  const rolePermissions = getThickThreadRolePermissionsBlob(threadType);
  const membershipPermissions = createPermissionsInfo(
    threadID,
    threadType,
    true,
    parentThreadInfo,
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
  utilities: ProcessDMOperationUtilities,
): MutableThickRawThreadInfo {
  const {
    threadID,
    threadType,
    creationTime,
    parentThreadID,
    allMemberIDsWithSubscriptions,
    roleID,
    unread,
    name,
    avatar,
    description,
    color,
    containingThreadID,
    sourceMessageID,
    repliesCount,
    pinnedCount,
    timestamps,
  } = input;

  const memberIDs = allMemberIDsWithSubscriptions.map(({ id }) => id);
  const threadColor = color ?? generatePendingThreadColor(memberIDs);

  const parentThreadInfo = parentThreadID
    ? utilities.threadInfos[parentThreadID]
    : null;
  if (parentThreadID && !parentThreadInfo) {
    console.log(
      `Parent thread with ID ${parentThreadID} was expected while creating ` +
        'thick thread but is missing from the store',
    );
  }

  const { membershipPermissions, role } =
    createRoleAndPermissionForThickThreads(
      threadType,
      threadID,
      roleID,
      parentThreadInfo,
    );

  const viewerIsMember = allMemberIDsWithSubscriptions.some(
    member => member.id === utilities.viewerID,
  );
  const viewerRoleID = viewerIsMember ? role.id : null;
  const viewerMembershipPermissions = createPermissionsInfo(
    threadID,
    threadType,
    viewerIsMember,
    parentThreadInfo,
  );

  const newThread: MutableThickRawThreadInfo = {
    thick: true,
    minimallyEncoded: true,
    id: threadID,
    type: threadType,
    color: threadColor,
    creationTime,
    parentThreadID,
    members: allMemberIDsWithSubscriptions.map(
      ({ id: memberID, subscription }) =>
        minimallyEncodeMemberInfo<ThickMemberInfo>({
          id: memberID,
          role: memberID === utilities.viewerID ? viewerRoleID : role.id,
          permissions:
            memberID === utilities.viewerID
              ? viewerMembershipPermissions
              : membershipPermissions,
          isSender: memberID === utilities.viewerID,
          subscription,
        }),
    ),
    roles: {
      [role.id]: role,
    },
    currentUser: minimallyEncodeThreadCurrentUserInfo({
      role: viewerRoleID,
      permissions: viewerMembershipPermissions,
      subscription: joinThreadSubscription,
      unread,
    }),
    repliesCount: repliesCount ?? 0,
    name,
    avatar,
    description: description ?? '',
    containingThreadID,
    timestamps,
  };
  if (sourceMessageID) {
    newThread.sourceMessageID = sourceMessageID;
  }
  if (pinnedCount) {
    newThread.pinnedCount = pinnedCount;
  }
  return newThread;
}

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMCreateThreadOperation,
) {
  const { threadID, creatorID, time, threadType, memberIDs, newMessageID } =
    dmOperation;
  const allMemberIDs = [creatorID, ...memberIDs];
  const color = generatePendingThreadColor(allMemberIDs);
  const messageData = {
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
  const rawMessageInfo = rawMessageInfoFromMessageData(
    messageData,
    newMessageID,
  );
  return { messageData, rawMessageInfo };
}

const createThreadSpec: DMOperationSpec<DMCreateThreadOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMCreateThreadOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { threadID, creatorID, time, threadType, memberIDs, roleID } =
        dmOperation;
      const { viewerID } = utilities;
      const allMemberIDs = [creatorID, ...memberIDs];
      const allMemberIDsWithSubscriptions = allMemberIDs.map(id => ({
        id,
        subscription: joinThreadSubscription,
      }));

      const rawThreadInfo = createThickRawThreadInfo(
        {
          threadID,
          threadType,
          creationTime: time,
          allMemberIDsWithSubscriptions,
          roleID,
          unread: creatorID !== viewerID,
          timestamps: createThreadTimestamps(time, allMemberIDs),
        },
        utilities,
      );

      const messageDataWithMessageInfos =
        createMessageDataWithInfoFromDMOperation(dmOperation);
      const { rawMessageInfo } = messageDataWithMessageInfos;
      const rawMessageInfos = [rawMessageInfo];

      const threadJoinUpdateInfo = {
        type: updateTypes.JOIN_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: rawThreadInfo,
        rawMessageInfos,
        truncationStatus: messageTruncationStatus.EXHAUSTIVE,
        rawEntryInfos: [],
      };

      const notificationsCreationData = {
        messageDatasWithMessageInfos: [messageDataWithMessageInfos],
        thickRawThreadInfos: {
          [threadID]: rawThreadInfo,
        },
      };

      return {
        rawMessageInfos: [], // included in updateInfos below
        updateInfos: [threadJoinUpdateInfo],
        blobOps: [],
        notificationsCreationData,
      };
    },
    canBeProcessed: async (
      dmOperation: DMCreateThreadOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      if (utilities.threadInfos[dmOperation.threadID]) {
        console.log(
          'Discarded a CREATE_THREAD operation because thread ' +
            `with the same ID ${dmOperation.threadID} already exists ` +
            'in the store',
        );
        return {
          isProcessingPossible: false,
          reason: {
            type: 'invalid',
          },
        };
      }
      return { isProcessingPossible: true };
    },
    supportsAutoRetry: true,
    operationValidator: dmCreateThreadOperationValidator,
  });

export {
  createThickRawThreadInfo,
  createThreadSpec,
  createRoleAndPermissionForThickThreads,
  createPermissionsInfo,
};
