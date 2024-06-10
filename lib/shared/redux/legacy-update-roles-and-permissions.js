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
  ThreadStoreThreadInfos,
  LegacyMemberInfo,
  MixedRawThreadInfos,
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

// This migration utility can only be used with LegacyRawThreadInfos
function legacyUpdateRolesAndPermissions(
  threadStoreInfos: MixedRawThreadInfos,
): MixedRawThreadInfos {
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
        permissions: computedRolePermissionBlobs[roles[roleID].name],
      };
    }
    updatedThreadStoreInfos[node.threadID] = {
      ...threadInfo,
      roles,
    };

    node.children?.map(recursivelyUpdateRoles);
  };

  const recursivelyUpdatePermissions = (
    node: $ReadOnly<ThreadTraversalNode>,
    memberToThreadPermissionsFromParent: ?MemberToThreadPermissionsFromParent,
  ): void => {
    const threadInfo: LegacyRawThreadInfo =
      updatedThreadStoreInfos[node.threadID];

    const updatedMembers = [];
    const memberToThreadPermissionsForChildren: {
      [string]: ?ThreadPermissionsBlob,
    } = {};
    for (const member: LegacyMemberInfo of threadInfo.members) {
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
