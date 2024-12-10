// @flow

import _orderBy from 'lodash/fp/orderBy.js';
import * as React from 'react';

import { childThreadInfos } from '../selectors/thread-selectors.js';
import { getMostRecentNonLocalMessageID } from '../shared/message-utils.js';
import { threadInChatList } from '../shared/thread-utils.js';
import type { MessageStore, RawMessageInfo } from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsSidebar } from '../types/thread-types-enum.js';
import type { SidebarInfo } from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

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

function useSidebarInfos(): { +[id: string]: $ReadOnlyArray<SidebarInfo> } {
  const childThreadInfoByParentID = useSelector(childThreadInfos);
  const messageStore = useSelector(state => state.messageStore);

  return React.useMemo(() => {
    const result: { [id: string]: $ReadOnlyArray<SidebarInfo> } = {};
    for (const parentID in childThreadInfoByParentID) {
      const childThreads = childThreadInfoByParentID[parentID];
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
      result[parentID] = _orderBy('lastUpdatedTime')('desc')(sidebarInfos);
    }
    return result;
  }, [childThreadInfoByParentID, messageStore]);
}

export { useSidebarInfos };
