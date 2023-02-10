// @flow

import {
  getContainingThreadID,
  getCommunity,
} from 'lib/shared/thread-utils.js';
import type { ServerThreadInfo } from 'lib/types/thread-types.js';

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';

async function addColumnAndIndexes() {
  await dbQuery(SQL`
    ALTER TABLE threads
      ADD containing_thread_id BIGINT(20) NULL AFTER parent_thread_id,
      ADD community BIGINT(20) NULL AFTER containing_thread_id,
      ADD depth INT UNSIGNED NOT NULL DEFAULT 0 AFTER community,
      ADD INDEX parent_thread_id (parent_thread_id),
      ADD INDEX community (community),
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
  threadInfos: { +[id: string]: ServerThreadInfo },
): Promise<ServerThreadInfo[]> {
  const updatedThreadInfos = [];
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    const containingThreadID = getContainingThreadID(
      parentThreadInfo,
      threadInfo.type,
    );
    const community = getCommunity(parentThreadInfo);
    if (!containingThreadID && !community) {
      console.log(
        `containingThreadID and community are null for ${threadID}, ` +
          'skipping...',
      );
      updatedThreadInfos.push(threadInfo);
      continue;
    }
    const depth = parentThreadInfo ? parentThreadInfo.depth + 1 : 0;
    console.log(
      `setting containingThreadID to ${containingThreadID ?? 'null'}, ` +
        `community to ${community ?? 'null'}, and ` +
        `depth to ${depth} for ${threadID}`,
    );
    await dbQuery(SQL`
      UPDATE threads
      SET containing_thread_id = ${containingThreadID},
        community = ${community},
        depth = ${depth}
      WHERE id = ${threadID}
    `);
    updatedThreadInfos.push({
      ...threadInfo,
      containingThreadID,
      community,
      depth,
    });
  }
  return updatedThreadInfos;
}

main([addColumnAndIndexes, setColumn]);
