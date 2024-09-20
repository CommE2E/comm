// @flow

import invariant from 'invariant';
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
import { createThreadTimestamps } from '../thread-utils.js';

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

function createPermissionsInfoForNonMembers(
  threadID: string,
  threadType: ThickThreadType,
  parentThreadInfo: ?ThickRawThreadInfo,
): ThreadPermissionsInfo {
  if (!parentThreadInfo) {
    return getAllThreadPermissions(
      makePermissionsBlob(null, null, threadID, threadType),
      threadID,
    );
  }
  const parentThreadRolePermissions = getThickThreadRolePermissionsBlob(
    parentThreadInfo.type,
  );
  const parentPermissionsBlob = makePermissionsBlob(
    parentThreadRolePermissions,
    null,
    parentThreadInfo.id,
    parentThreadInfo.type,
  );
  return getAllThreadPermissions(
    makePermissionsBlob(
      null,
      makePermissionsForChildrenBlob(parentPermissionsBlob),
      threadID,
      threadType,
    ),
    threadID,
  );
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

  const { membershipPermissions, role } =
    createRoleAndPermissionForThickThreads(threadType, threadID, roleID);

  const isViewerMember = allMemberIDsWithSubscriptions.some(
    member => member.id === utilities.viewerID,
  );
  let viewerMembershipPermissions = membershipPermissions;
  let viewerRoleID: ?string = role.id;
  if (!isViewerMember) {
    viewerRoleID = null;
    const parentThreadInfo = parentThreadID
      ? utilities.threadInfos[parentThreadID]
      : null;
    invariant(
      !parentThreadInfo || parentThreadInfo.thick,
      'Parent thread should be thick',
    );
    viewerMembershipPermissions = createPermissionsInfoForNonMembers(
      threadID,
      threadType,
      parentThreadInfo,
    );
  }

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
    description,
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
    notificationsCreationData: async (dmOperation: DMCreateThreadOperation) => {
      return {
        messageDatasWithMessageInfos: [
          createMessageDataWithInfoFromDMOperation(dmOperation),
        ],
      };
    },
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

      const { rawMessageInfo } =
        createMessageDataWithInfoFromDMOperation(dmOperation);
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

      return {
        rawMessageInfos: [], // included in updateInfos below
        updateInfos: [threadJoinUpdateInfo],
        blobOps: [],
      };
    },
    canBeProcessed: async () => {
      return { isProcessingPossible: true };
    },
    supportsAutoRetry: true,
  });

export {
  createThickRawThreadInfo,
  createThreadSpec,
  createRoleAndPermissionForThickThreads,
  createPermissionsInfoForNonMembers,
};
