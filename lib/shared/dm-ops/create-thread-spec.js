// @flow

import uuid from 'uuid';

import type { DMOperationSpec } from './dm-op-spec.js';
import { specialRoles } from '../../permissions/special-roles.js';
import {
  getAllThreadPermissions,
  makePermissionsBlob,
  getThickThreadRolePermissionsBlob,
} from '../../permissions/thread-permissions.js';
import { generatePendingThreadColor } from '../../shared/color-utils.js';
import type { DMCreateThreadOperation } from '../../types/dm-ops.js';
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
import { defaultThreadSubscription } from '../../types/subscription-types.js';
import type { ThickThreadType } from '../../types/thread-types-enum.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';

type CreateThickRawThreadInfoInput = {
  +threadID: string,
  +threadType: ThickThreadType,
  +creationTime: number,
  +parentThreadID?: ?string,
  +allMemberIDs: $ReadOnlyArray<string>,
  +roleID: string,
  +creatorID: string,
  +viewerID: string,
};
type MutableThickRawThreadInfo = { ...ThickRawThreadInfo };
export function createThickRawThreadInfo(
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
  } = input;

  const color = generatePendingThreadColor(allMemberIDs);

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
    thick: true,
    minimallyEncoded: true,
    id: threadID,
    type: threadType,
    color,
    creationTime,
    parentThreadID,
    members: allMemberIDs.map(memberID =>
      minimallyEncodeMemberInfo<ThickMemberInfo>({
        id: memberID,
        role: role.id,
        permissions: membershipPermissions,
        isSender: memberID === viewerID,
        subscription: defaultThreadSubscription,
      }),
    ),
    roles: {
      [role.id]: role,
    },
    currentUser: minimallyEncodeThreadCurrentUserInfo({
      role: role.id,
      permissions: membershipPermissions,
      subscription: defaultThreadSubscription,
      unread: creatorID !== viewerID,
    }),
    repliesCount: 0,
  };
}

export const createThreadSpec: DMOperationSpec<DMCreateThreadOperation> =
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
        truncationStatus: messageTruncationStatus.UNCHANGED,
        rawEntryInfos: [],
      };

      return {
        rawMessageInfos: [], // included in updateInfos below
        updateInfos: [threadJoinUpdateInfo],
      };
    },
  });
