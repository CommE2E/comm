// @flow

import {
  getAllThreadPermissions,
  getRolePermissionBlobs,
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
} from '../../permissions/thread-permissions.js';
import { assertAllThreadInfosAreLegacy } from '../../shared/thread-utils.js';
import type { ThreadPermissionsBlob } from '../../types/thread-permission-types.js';
import type {
  LegacyRawThreadInfo,
  LegacyRawThreadInfos,
  ThreadStoreThreadInfos,
  LegacyMemberInfo,
  MixedRawThreadInfos,
  ThickMemberInfo,
} from '../../types/thread-types.js';
import { values } from '../../utils/objects.js';

type ThreadTraversalNode = {
  +threadID: string,
  +children: ?$ReadOnlyArray<ThreadTraversalNode>,
};

function constructThreadTraversalNodes(
  threadStoreInfos: ThreadStoreThreadInfos,
): $ReadOnlyArray<$ReadOnly<ThreadTraversalNode>> {
  const parentThreadMap: { [string]: Array<string> } = {};

  for (const threadInfo of values(threadStoreInfos)) {
    const parentThreadID = threadInfo.parentThreadID ?? 'root';
    parentThreadMap[parentThreadID] = [
      ...(parentThreadMap[parentThreadID] ?? []),
      threadInfo.id,
    ];
  }

  const constructNodes = (nodeID: string): ThreadTraversalNode => ({
    threadID: nodeID,
    children: parentThreadMap[nodeID]?.map(constructNodes) ?? null,
  });

  if (!parentThreadMap['root']) {
    return [];
  }

  return parentThreadMap['root'].map(constructNodes);
}

type MemberToThreadPermissionsFromParent = {
  +[member: string]: ?ThreadPermissionsBlob,
};

type BaseMemberInfo = {
  +id: string,
  +role: ?string,
  ...
};

// This migration utility can only be used with LegacyRawThreadInfos
function legacyUpdateRolesAndPermissions(
  threadStoreInfos: MixedRawThreadInfos,
): LegacyRawThreadInfos {
  const updatedThreadStoreInfos = assertAllThreadInfosAreLegacy({
    ...threadStoreInfos,
  });

  const recursivelyUpdateRoles = (
    node: $ReadOnly<ThreadTraversalNode>,
  ): void => {
    const threadInfo: LegacyRawThreadInfo =
      updatedThreadStoreInfos[node.threadID];
    const computedRolePermissionBlobs = getRolePermissionBlobs(threadInfo.type);

    const roles = { ...threadInfo.roles };
    for (const roleID of Object.keys(roles)) {
      roles[roleID] = {
        ...roles[roleID],
        // $FlowFixMe[invalid-computed-prop]
        permissions: computedRolePermissionBlobs[roles[roleID].name],
      };
    }
    updatedThreadStoreInfos[node.threadID] = {
      ...threadInfo,
      roles,
    };

    node.children?.map(recursivelyUpdateRoles);
  };

  const updateMembers = <T: BaseMemberInfo>(
    threadInfo: LegacyRawThreadInfo,
    members: $ReadOnlyArray<$ReadOnly<T>>,
    memberToThreadPermissionsFromParent: ?MemberToThreadPermissionsFromParent,
  ): {
    members: $ReadOnlyArray<$ReadOnly<T>>,
    memberToThreadPermissionsForChildren: { [string]: ?ThreadPermissionsBlob },
  } => {
    const updatedMembers = [];
    const memberToThreadPermissionsForChildren: {
      [string]: ?ThreadPermissionsBlob,
    } = {};
    for (const member of members) {
      const { id, role } = member;

      const rolePermissions = role ? threadInfo.roles[role].permissions : null;
      const permissionsFromParent = memberToThreadPermissionsFromParent?.[id];

      const computedPermissions = makePermissionsBlob(
        rolePermissions,
        permissionsFromParent,
        threadInfo.id,
        threadInfo.type,
      );

      updatedMembers.push({
        ...member,
        permissions: getAllThreadPermissions(
          computedPermissions,
          threadInfo.id,
        ),
      });

      memberToThreadPermissionsForChildren[member.id] =
        makePermissionsForChildrenBlob(computedPermissions);
    }
    return {
      members: updatedMembers,
      memberToThreadPermissionsForChildren,
    };
  };

  const recursivelyUpdatePermissions = (
    node: $ReadOnly<ThreadTraversalNode>,
    memberToThreadPermissionsFromParent: ?MemberToThreadPermissionsFromParent,
  ): void => {
    const threadInfo: LegacyRawThreadInfo =
      updatedThreadStoreInfos[node.threadID];

    let memberToThreadPermissionsForChildren: {
      [string]: ?ThreadPermissionsBlob,
    };
    if (threadInfo.thick) {
      const {
        members: updatedMembers,
        memberToThreadPermissionsForChildren:
          updatedMemberToThreadPermissionsForChildren,
      } = updateMembers<ThickMemberInfo>(
        threadInfo,
        threadInfo.members,
        memberToThreadPermissionsFromParent,
      );
      updatedThreadStoreInfos[node.threadID] = {
        ...threadInfo,
        members: updatedMembers,
      };
      memberToThreadPermissionsForChildren =
        updatedMemberToThreadPermissionsForChildren;
    } else {
      const {
        members: updatedMembers,
        memberToThreadPermissionsForChildren:
          updatedMemberToThreadPermissionsForChildren,
      } = updateMembers<LegacyMemberInfo>(
        threadInfo,
        threadInfo.members,
        memberToThreadPermissionsFromParent,
      );
      updatedThreadStoreInfos[node.threadID] = {
        ...threadInfo,
        members: updatedMembers,
      };
      memberToThreadPermissionsForChildren =
        updatedMemberToThreadPermissionsForChildren;
    }

    node.children?.map(child =>
      recursivelyUpdatePermissions(child, memberToThreadPermissionsForChildren),
    );
  };

  const recursivelyUpdateCurrentMemberPermissions = (
    node: $ReadOnly<ThreadTraversalNode>,
    permissionsFromParent: ?ThreadPermissionsBlob,
  ): void => {
    const threadInfo: LegacyRawThreadInfo =
      updatedThreadStoreInfos[node.threadID];
    const { currentUser, roles } = threadInfo;
    const { role } = currentUser;

    const rolePermissions = role ? roles[role].permissions : null;
    const computedPermissions = makePermissionsBlob(
      rolePermissions,
      permissionsFromParent,
      threadInfo.id,
      threadInfo.type,
    );

    updatedThreadStoreInfos[node.threadID] = {
      ...threadInfo,
      currentUser: {
        ...currentUser,
        permissions: getAllThreadPermissions(
          computedPermissions,
          threadInfo.id,
        ),
      },
    };

    node.children?.map(child =>
      recursivelyUpdateCurrentMemberPermissions(
        child,
        makePermissionsForChildrenBlob(computedPermissions),
      ),
    );
  };

  const rootNodes = constructThreadTraversalNodes(updatedThreadStoreInfos);
  rootNodes.forEach(recursivelyUpdateRoles);
  rootNodes.forEach(node => recursivelyUpdatePermissions(node, null));
  rootNodes.forEach(node =>
    recursivelyUpdateCurrentMemberPermissions(node, null),
  );
  return updatedThreadStoreInfos;
}

export { legacyUpdateRolesAndPermissions };
