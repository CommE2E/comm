// @flow

import * as React from 'react';

import {
  type ChatThreadItem,
  createChatThreadItem,
  messageInfoSelector,
} from 'lib/selectors/chat-selectors.js';
import { sidebarInfoSelector } from 'lib/selectors/sidebar-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { useSelector } from '../redux/redux-utils.js';

function useChatThreadItem(threadInfo: ?ThreadInfo): ?ChatThreadItem {
  const messageInfos = useSelector(messageInfoSelector);
  const sidebarInfos = useSelector(sidebarInfoSelector);
  const messageStore = useSelector(state => state.messageStore);

  return React.useMemo(() => {
    if (!threadInfo) {
      return null;
    }

    return createChatThreadItem(
      threadInfo,
      messageStore,
      messageInfos,
      sidebarInfos[threadInfo.id],
    );
  }, [messageInfos, messageStore, sidebarInfos, threadInfo]);
}

function useActiveChatThreadItem(): ?ChatThreadItem {
  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );
  const pendingThreadInfo = useSelector(state => state.navInfo.pendingThread);
  const threadInfos = useSelector(threadInfoSelector);
  const threadInfo = React.useMemo(() => {
    if (!activeChatThreadID) {
      return null;
    }
    const isPending = threadIsPending(activeChatThreadID);
    return isPending ? pendingThreadInfo : threadInfos[activeChatThreadID];
  }, [activeChatThreadID, pendingThreadInfo, threadInfos]);
  return useChatThreadItem(threadInfo);
}

export { useChatThreadItem, useActiveChatThreadItem };
