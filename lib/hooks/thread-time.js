// @flow

import type { MessageInfo, MessageStore } from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';

function getLastUpdatedTime(
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
  messages: { +[id: string]: ?MessageInfo },
): number {
  const thread = messageStore.threads[threadInfo.id];
  if (!thread) {
    return threadInfo.creationTime;
  }
  for (const messageID of thread.messageIDs) {
    const messageInfo = messages[messageID];
    if (!messageInfo) {
      continue;
    }
    return messageInfo.time;
  }
  return threadInfo.creationTime;
}

export { getLastUpdatedTime };
