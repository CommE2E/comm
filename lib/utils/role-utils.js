// @flow

import _groupBy from 'lodash/fp/groupBy.js';
import _toPairs from 'lodash/fp/toPairs.js';
import * as React from 'react';

import { useSelector } from './redux-utils.js';
import { useSortedENSResolvedUsers } from '../hooks/names-cache.js';
import { threadInfoSelector } from '../selectors/thread-selectors.js';
import type {
  RelativeMemberInfo,
  RoleInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  configurableCommunityPermissions,
  type ThreadRolePermissionsBlob,
  type UserSurfacedPermission,
} from '../types/thread-permission-types.js';
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

function useRolesFromCommunityThreadInfo(
  threadInfo: ThreadInfo,
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

  return React.useMemo(() => {
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
      roleMap.set(
        memberInfo.id,
        memberInfo.role ? roles[memberInfo.role] : null,
      );
    });
    return roleMap;
  }, [topMostThreadInfo, threadInfo, memberInfos]);
}

function useMembersGroupedByRole(
  threadInfo: ThreadInfo,
): $ReadOnlyMap<string, $ReadOnlyArray<RelativeMemberInfo>> {
  const { members } = threadInfo;
  const sortedENSResolvedMembers = useSortedENSResolvedUsers(members);

  const roles = useRolesFromCommunityThreadInfo(
    threadInfo,
    sortedENSResolvedMembers,
  );

  const groupByRoleName = React.useMemo(
    () =>
      _groupBy(member => roles.get(member.id)?.name)(sortedENSResolvedMembers),
    [sortedENSResolvedMembers, roles],
  );

  const membersGroupedByRoleMap = React.useMemo(() => {
    const map: Map<string, $ReadOnlyArray<RelativeMemberInfo>> = new Map();

    _toPairs(groupByRoleName)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([roleName, memberInfos]) => map.set(roleName, memberInfos));

    return map;
  }, [groupByRoleName]);

  return membersGroupedByRoleMap;
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

function userSurfacedPermissionsFromRolePermissions(
  rolePermissions: ThreadRolePermissionsBlob,
): Set<UserSurfacedPermission> {
  const setOfUserSurfacedPermissions = new Set<UserSurfacedPermission>();

  Object.keys(rolePermissions).forEach(rolePermission => {
    const userSurfacedPermission = Object.keys(
      configurableCommunityPermissions,
    ).find(key => configurableCommunityPermissions[key].has(rolePermission));

    if (userSurfacedPermission) {
      setOfUserSurfacedPermissions.add(userSurfacedPermission);
    }
  });

  return setOfUserSurfacedPermissions;
}

export {
  constructRoleDeletionMessagePrompt,
  useRolesFromCommunityThreadInfo,
  toggleUserSurfacedPermission,
  useMembersGroupedByRole,
  userSurfacedPermissionsFromRolePermissions,
};
