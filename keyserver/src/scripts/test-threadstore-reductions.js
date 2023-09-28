// @flow

import ashoat from 'lib/facts/ashoat.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { RawThreadInfos } from 'lib/types/thread-types.js';

import { main } from './utils.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import { createScriptViewer } from '../session/scripts.js';

const viewer = createScriptViewer(ashoat.id);

const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const messageSelectionCriteria = { joinedThreads: true, newerThan: oneWeekAgo };

async function testThreadStoreReductions() {
  const [{ threadInfos }, { rawMessageInfos }] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchMessageInfos(viewer, messageSelectionCriteria, 1),
  ]);
  const beforeReductions = JSON.stringify(threadInfos);
  const beforeBytes = new Blob([beforeReductions]).size;
  console.log(
    `before reductions, Ashoat's ThreadStore is ${beforeBytes} bytes large`,
  );

  const withoutOldSidebars = filterOutOldSidebars(threadInfos, rawMessageInfos);
  const withoutOldSidebarsString = JSON.stringify(withoutOldSidebars);
  const withoutOldSidebarsBytes = new Blob([withoutOldSidebarsString]).size;
  console.log(
    "after filtering out old sidebars, Ashoat's ThreadStore is " +
      `${withoutOldSidebarsBytes} bytes large`,
  );
}

function filterOutOldSidebars(
  threadInfos: RawThreadInfos,
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
): RawThreadInfos {
  const newestTimePerThread = new Map();
  for (const messageInfo of messageInfos) {
    const { threadID, time } = messageInfo;
    const currentNewest = newestTimePerThread.get(threadID);
    if (!currentNewest || currentNewest < time) {
      newestTimePerThread.set(threadID, time);
    }
  }

  const filtered = {};
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    const latestUpdate = newestTimePerThread.get(threadID);
    if (
      threadInfo.type !== threadTypes.SIDEBAR ||
      (latestUpdate && latestUpdate >= oneWeekAgo)
    ) {
      filtered[threadID] = threadInfo;
    }
  }
  return filtered;
}

main([testThreadStoreReductions]);
