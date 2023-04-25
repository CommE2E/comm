// @flow

import type { ThreadStoreThreadInfos } from 'lib/types/thread-types.js';
import { values } from 'lib/utils/objects.js';

type ThreadTraversalNode = {
  +threadID: string,
  +children: ?$ReadOnlyArray<ThreadTraversalNode>,
};

function constructThreadTraversalNodes(
  threadStoreInfos: ThreadStoreThreadInfos,
): $ReadOnlyArray<ThreadTraversalNode> {
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
  constructThreadTraversalNodes(threadStoreInfos);
  return threadStoreInfos;
}

export { updateRolesAndPermissions };
