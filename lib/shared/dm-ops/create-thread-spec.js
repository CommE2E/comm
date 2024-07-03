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
} from '../../permissions/thread-permissions.js';
import { generatePendingThreadColor } from '../../shared/color-utils.js';
import { isInvalidSidebarSource } from '../../shared/message-utils.js';
import type { DMCreateThreadOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import {
  type ThickRawThreadInfo,
  type RoleInfo,
  minimallyEncodeMemberInfo,
  minimallyEncodeRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import { defaultThreadSubscription } from '../../types/subscription-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';

export const createThreadSpec: DMOperationSpec<DMCreateThreadOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMCreateThreadOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const {
        threadID,
        creatorID,
        time,
        threadType,
        parentThreadID,
        memberIDs,
        sourceMessageID,
      } = dmOperation;
      const allMemberIDs = [creatorID, ...memberIDs];
      const color = generatePendingThreadColor(allMemberIDs);

      const rolePermissions = getThickThreadRolePermissionsBlob(threadType);
      const membershipPermissions = getAllThreadPermissions(
        makePermissionsBlob(rolePermissions, null, threadID, threadType),
        threadID,
      );
      const role: RoleInfo = {
        ...minimallyEncodeRoleInfo({
          id: `${threadID}/role`,
          name: 'Members',
          permissions: rolePermissions,
          isDefault: true,
        }),
        specialRole: specialRoles.DEFAULT_ROLE,
      };

      const rawThreadInfo: { ...ThickRawThreadInfo } = {
        thick: true,
        minimallyEncoded: true,
        id: threadID,
        type: threadType,
        color,
        creationTime: time,
        parentThreadID,
        members: allMemberIDs.map(memberID =>
          minimallyEncodeMemberInfo<ThickMemberInfo>({
            id: memberID,
            role: role.id,
            permissions: membershipPermissions,
            isSender: false,
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
      if (threadType === threadTypes.THICK_SIDEBAR) {
        invariant(
          sourceMessageID && parentThreadID,
          'THICK_SIDEBAR should have sourceMessageID and parentThreadID',
        );
        rawThreadInfo.sourceMessageID = sourceMessageID;
        rawThreadInfo.containingThreadID = parentThreadID;
      }

      const rawMessageInfos: Array<RawMessageInfo> = [];
      if (threadType === threadTypes.THICK_SIDEBAR) {
        invariant(
          sourceMessageID && parentThreadID,
          'THICK_SIDEBAR should have sourceMessageID and parentThreadID',
        );
        const sourceMessage = await utilities.fetchMessage(sourceMessageID);
        invariant(
          sourceMessage,
          `could not find sourceMessage ${sourceMessageID}... probably ` +
            'joined thick thread ${parentThreadID} after its creation',
        );
        invariant(
          !isInvalidSidebarSource(sourceMessage),
          `sourceMessage ${sourceMessageID} is an invalid sidebar source`,
        );
        const sidebarSourceMessageInfo = {
          type: messageTypes.SIDEBAR_SOURCE,
          id: `${threadID}/sidebar_source_message`,
          threadID,
          creatorID,
          time,
          sourceMessage,
        };
        const createSidebarMessageInfo = {
          type: messageTypes.CREATE_SIDEBAR,
          id: `${threadID}/create_sidebar_message`,
          threadID,
          creatorID,
          time: time + 1,
          sourceMessageAuthorID: sourceMessage.creatorID,
          initialThreadState: {
            parentThreadID,
            color,
            memberIDs: allMemberIDs,
          },
        };
        rawMessageInfos.push(
          sidebarSourceMessageInfo,
          createSidebarMessageInfo,
        );
      } else {
        const createThreadMessageInfo = {
          type: messageTypes.CREATE_THREAD,
          id: `${threadID}/create_thread_message`,
          threadID,
          creatorID,
          time,
          initialThreadState: {
            type: threadType,
            color,
            memberIDs: allMemberIDs,
          },
        };
        rawMessageInfos.push(createThreadMessageInfo);
      }

      const threadJoinUpdateInfo = {
        type: updateTypes.JOIN_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: rawThreadInfo,
        rawMessageInfos,
        truncationStatus: 'unchanged',
        rawEntryInfos: [],
      };

      return {
        rawMessageInfos: [], // included in updateInfos below
        updateInfos: [threadJoinUpdateInfo],
      };
    },
  });
