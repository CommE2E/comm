// @flow

import { getRolePermissionBlobs } from 'lib/permissions/thread-permissions.js';
import type {
  RawThreadInfo,
  ThreadStoreThreadInfos,
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

function updateRolesAndPermissions(
  threadStoreInfos: ThreadStoreThreadInfos,
): ThreadStoreThreadInfos {
  const updatedThreadStoreInfos = { ...threadStoreInfos };
  const rootNodes = constructThreadTraversalNodes(updatedThreadStoreInfos);

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

  rootNodes.forEach(recursivelyUpdateRoles);

  return updatedThreadStoreInfos;
}

export { updateRolesAndPermissions };
