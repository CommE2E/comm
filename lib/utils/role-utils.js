// @flow

import * as React from 'react';

import { useSelector } from './redux-utils.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import type { MinimallyEncodedThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import {
  configurableCommunityPermissions,
  type ThreadRolePermissionsBlob,
  type UserSurfacedPermission,
} from '../types/thread-permission-types.js';
import type {
  LegacyThreadInfo,
  RoleInfo,
  RelativeMemberInfo,
} from '../types/thread-types';
import { threadTypes } from '../types/thread-types-enum.js';

function constructRoleDeletionMessagePrompt(
  defaultRoleName: string,
  memberCount: number,
): string {
  let message;
  if (memberCount === 0) {
    message = 'Are you sure you want to delete this role?';
  } else {
    const messageNoun = memberCount === 1 ? 'member' : 'members';
    const messageVerb = memberCount === 1 ? 'is' : 'are';
    message =
      `There ${messageVerb} currently ${memberCount} ${messageNoun} with ` +
      `this role. Deleting the role will automatically assign the ` +
      `${messageNoun} affected to the ${defaultRoleName} role.`;
  }

  return message;
}

type RoleDeletableAndEditableStatus = {
  +isDeletable: boolean,
  +isEditable: boolean,
};
function useRoleDeletableAndEditableStatus(
  roleName: string,
  defaultRoleID: string,
  existingRoleID: string,
): RoleDeletableAndEditableStatus {
  return React.useMemo(() => {
    const canDelete = roleName !== 'Admins' && defaultRoleID !== existingRoleID;
    const canEdit = roleName !== 'Admins';

    return {
      isDeletable: canDelete,
      isEditable: canEdit,
    };
  }, [roleName, defaultRoleID, existingRoleID]);
}

function useRolesFromCommunityThreadInfo(
  threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
  memberInfos: $ReadOnlyArray<RelativeMemberInfo>,
): $ReadOnlyMap<string, ?RoleInfo> {
  // Our in-code system has chat-specific roles, while the
  // user-surfaced system has roles only for communities. We retrieve roles
  // from the top-level community thread for accuracy, with a rare fallback
  // for potential issues reading memberInfos, primarily in GENESIS threads.
  // The special case is GENESIS threads, since per prior discussion
  // (see context: https://linear.app/comm/issue/ENG-4077/), we don't really
  // support roles for it. Also with GENESIS, the list of members are not
  // populated in the community root. So in this case to prevent crashing, we
  // should just return the role name from the current thread info.
  const { community } = threadInfo;
  const communityThreadInfo = useSelector(state =>
    community ? threadInfoSelector(state)[community] : null,
  );
  const topMostThreadInfo = communityThreadInfo || threadInfo;
  const roleMap = new Map<string, ?RoleInfo>();

  if (topMostThreadInfo.type === threadTypes.GENESIS) {
    memberInfos.forEach(memberInfo =>
      roleMap.set(
        memberInfo.id,
        memberInfo.role ? threadInfo.roles[memberInfo.role] : null,
      ),
    );
    return roleMap;
  }

  const { members: memberInfosFromTopMostThreadInfo, roles } =
    topMostThreadInfo;
  memberInfosFromTopMostThreadInfo.forEach(memberInfo => {
    roleMap.set(memberInfo.id, memberInfo.role ? roles[memberInfo.role] : null);
  });
  return roleMap;
}

function toggleUserSurfacedPermission(
  rolePermissions: ThreadRolePermissionsBlob,
  userSurfacedPermission: UserSurfacedPermission,
): ThreadRolePermissionsBlob {
  const userSurfacedPermissionSet = Array.from(
    configurableCommunityPermissions[userSurfacedPermission],
  );
  const currentRolePermissions = { ...rolePermissions };

  const roleHasPermission = userSurfacedPermissionSet.every(
    permission => currentRolePermissions[permission],
  );

  if (roleHasPermission) {
    for (const permission of userSurfacedPermissionSet) {
      delete currentRolePermissions[permission];
    }
  } else {
    for (const permission of userSurfacedPermissionSet) {
      currentRolePermissions[permission] = true;
    }
  }

  return currentRolePermissions;
}

export {
  constructRoleDeletionMessagePrompt,
  useRoleDeletableAndEditableStatus,
  useRolesFromCommunityThreadInfo,
  toggleUserSurfacedPermission,
};
