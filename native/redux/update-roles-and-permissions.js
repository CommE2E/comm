// @flow

import {
  getAllThreadPermissions,
  getRolePermissionBlobs,
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
} from 'lib/permissions/thread-permissions.js';
import type {
  RawThreadInfo,
  ThreadPermissionsBlob,
  ThreadStoreThreadInfos,
  MemberInfo,
} from 'lib/types/thread-types.js';
import { values } from 'lib/utils/objects.js';

type ThreadTraversalNode = {
  +threadID: string,
  +children: ?$ReadOnlyArray<ThreadTraversalNode>,
};

function constructThreadTraversalNodes(
  threadStoreInfos: ThreadStoreThreadInfos,
): $ReadOnlyArray<$ReadOnly<ThreadTraversalNode>> {
  const parentThreadMap = {};

  for (const threadInfo of values(threadStoreInfos)) {
    const parentThreadID = threadInfo.parentThreadID ?? 'root';
    parentThreadMap[parentThreadID] = [
      ...(parentThreadMap[parentThreadID] ?? []),
      threadInfo.id,
    ];
  }

  const constructNodes = nodeID => ({
    threadID: nodeID,
    children: parentThreadMap[nodeID]?.map(constructNodes) ?? null,
  });

  return parentThreadMap['root'].map(constructNodes);
}

type MemberToThreadPermissionsFromParent = {
  +[member: string]: ?ThreadPermissionsBlob,
};

function updateRolesAndPermissions(
  threadStoreInfos: ThreadStoreThreadInfos,
): ThreadStoreThreadInfos {
  const updatedThreadStoreInfos = { ...threadStoreInfos };

  const recursivelyUpdateRoles = (node: $ReadOnly<ThreadTraversalNode>) => {
    const threadInfo: RawThreadInfo = updatedThreadStoreInfos[node.threadID];
    const computedRolePermissionBlobs = getRolePermissionBlobs(threadInfo.type);

    const roles = { ...threadInfo.roles };
    for (const roleID of Object.keys(roles)) {
      roles[roleID] = {
        ...roles[roleID],
        permissions: computedRolePermissionBlobs[roles[roleID].name],
      };
    }
    updatedThreadStoreInfos[node.threadID] = {
      ...threadInfo,
      roles,
    };

    return node.children?.map(recursivelyUpdateRoles);
  };

  const recursivelyUpdatePermissions = (
    node: $ReadOnly<ThreadTraversalNode>,
    memberToThreadPermissionsFromParent: ?MemberToThreadPermissionsFromParent,
  ) => {
    const threadInfo: RawThreadInfo = updatedThreadStoreInfos[node.threadID];

    const updatedMembers = [];
    const memberToThreadPermissionsForChildren = {};
    for (const member: MemberInfo of threadInfo.members) {
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

    updatedThreadStoreInfos[node.threadID] = {
      ...threadInfo,
      members: updatedMembers,
    };

    return node.children?.map(child =>
      recursivelyUpdatePermissions(child, memberToThreadPermissionsForChildren),
    );
  };

  const recursivelyUpdateCurrentMemberPermissions = (
    node: $ReadOnly<ThreadTraversalNode>,
    permissionsFromParent: ?ThreadPermissionsBlob,
  ) => {
    const threadInfo: RawThreadInfo = updatedThreadStoreInfos[node.threadID];
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

    return node.children?.map(child =>
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

export { updateRolesAndPermissions };
