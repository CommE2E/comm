// @flow

import _orderBy from 'lodash/fp/orderBy.js';
import { createObjectSelector } from 'reselect-map';

import { childThreadInfos } from '../selectors/thread-selectors.js';
import { getMostRecentNonLocalMessageID } from '../shared/message-utils.js';
import { threadInChatList } from '../shared/thread-utils.js';
import type { MessageStore, RawMessageInfo } from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import { threadTypeIsSidebar } from '../types/thread-types-enum.js';
import type { SidebarInfo } from '../types/thread-types.js';

function getMostRecentRawMessageInfo(
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
): ?RawMessageInfo {
  const thread = messageStore.threads[threadInfo.id];
  if (!thread) {
    return null;
  }
  for (const messageID of thread.messageIDs) {
    return messageStore.messages[messageID];
  }
  return null;
}

const sidebarInfoSelector: (state: BaseAppState<>) => {
  +[id: string]: $ReadOnlyArray<SidebarInfo>,
} = createObjectSelector(
  childThreadInfos,
  (state: BaseAppState<>) => state.messageStore,
  (childThreads: $ReadOnlyArray<ThreadInfo>, messageStore: MessageStore) => {
    const sidebarInfos = [];
    for (const childThreadInfo of childThreads) {
      if (
        !threadInChatList(childThreadInfo) ||
        !threadTypeIsSidebar(childThreadInfo.type)
      ) {
        continue;
      }
      const mostRecentRawMessageInfo = getMostRecentRawMessageInfo(
        childThreadInfo,
        messageStore,
      );
      const lastUpdatedTime =
        mostRecentRawMessageInfo?.time ?? childThreadInfo.creationTime;
      const mostRecentNonLocalMessage = getMostRecentNonLocalMessageID(
        childThreadInfo.id,
        messageStore,
      );
      sidebarInfos.push({
        threadInfo: childThreadInfo,
        lastUpdatedTime,
        mostRecentNonLocalMessage,
      });
    }
    return _orderBy('lastUpdatedTime')('desc')(sidebarInfos);
  },
);

export { sidebarInfoSelector };
