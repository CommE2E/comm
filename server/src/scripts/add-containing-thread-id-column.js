// @flow

import invariant from 'invariant';

import { threadTypes, type ServerThreadInfo } from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers';
import { main } from './utils';

async function addColumnAndIndexes() {
  await dbQuery(SQL`
    ALTER TABLE threads
      ADD containing_thread_id BIGINT(20) NULL AFTER parent_thread_id,
      ADD INDEX parent_thread_id (parent_thread_id),
      ADD INDEX containing_thread_id (containing_thread_id);
  `);
}

async function setColumn() {
  const stack = [[null, SQL`t.parent_thread_id IS NULL`]];

  while (stack.length > 0) {
    const [parentThreadInfo, predicate] = stack.shift();
    const { threadInfos } = await fetchServerThreadInfos(predicate);
    const updatedThreadInfos = await setColumnForLayer(
      parentThreadInfo,
      threadInfos,
    );
    for (const threadInfo of updatedThreadInfos) {
      stack.push([threadInfo, SQL`t.parent_thread_id = ${threadInfo.id}`]);
    }
  }
}

async function setColumnForLayer(
  parentThreadInfo: ?ServerThreadInfo,
  threadInfos: { [id: string]: ServerThreadInfo },
): Promise<ServerThreadInfo[]> {
  const updatedThreadInfos = [];
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    const containingThreadID = getContainingThread(
      threadInfo,
      parentThreadInfo,
    );
    if (!containingThreadID) {
      console.log(`containingThreadID is null for ${threadID}, skipping...`);
      updatedThreadInfos.push(threadInfo);
      continue;
    }
    console.log(
      `setting containingThreadID to ${containingThreadID} for ${threadID}`,
    );
    await dbQuery(SQL`
      UPDATE threads
      SET containing_thread_id = ${containingThreadID}
      WHERE id = ${threadID}
    `);
    updatedThreadInfos.push({
      ...threadInfo,
      containingThreadID,
    });
  }
  return updatedThreadInfos;
}

function getContainingThread(
  threadInfo: ServerThreadInfo,
  parentThreadInfo: ?ServerThreadInfo,
) {
  const { type, parentThreadID } = threadInfo;
  if (!parentThreadID) {
    return null;
  }
  if (type === threadTypes.SIDEBAR) {
    return parentThreadID;
  }
  invariant(parentThreadInfo, 'parentThreadInfo should be set');
  if (!parentThreadInfo.containingThreadID) {
    return parentThreadID;
  }
  return parentThreadInfo.containingThreadID;
}

main([addColumnAndIndexes, setColumn]);
