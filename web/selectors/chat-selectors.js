// @flow

import * as React from 'react';
import { createSelector } from 'reselect';

import {
  type ChatThreadItem,
  createChatThreadItem,
  messageInfoSelector,
} from 'lib/selectors/chat-selectors.js';
import {
  sidebarInfoSelector,
  threadInfoSelector,
} from 'lib/selectors/thread-selectors.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { MessageInfo, MessageStore } from 'lib/types/message-types.js';
import type { MinimallyEncodedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo, SidebarInfo } from 'lib/types/thread-types.js';

import type { AppState } from '../redux/redux-setup.js';
import { useSelector } from '../redux/redux-utils.js';

const activeChatThreadItem: (state: AppState) => ?ChatThreadItem =
  createSelector(
    threadInfoSelector,
    (state: AppState) => state.messageStore,
    messageInfoSelector,
    (state: AppState) => state.navInfo.activeChatThreadID,
    (state: AppState) => state.navInfo.pendingThread,
    sidebarInfoSelector,
    (
      threadInfos: {
        +[id: string]: LegacyThreadInfo | MinimallyEncodedThreadInfo,
      },
      messageStore: MessageStore,
      messageInfos: { +[id: string]: ?MessageInfo },
      activeChatThreadID: ?string,
      pendingThreadInfo: ?LegacyThreadInfo | ?MinimallyEncodedThreadInfo,
      sidebarInfos: { +[id: string]: $ReadOnlyArray<SidebarInfo> },
    ): ?ChatThreadItem => {
      if (!activeChatThreadID) {
        return null;
      }
      const isPending = threadIsPending(activeChatThreadID);
      const threadInfo = isPending
        ? pendingThreadInfo
        : threadInfos[activeChatThreadID];

      if (!threadInfo) {
        return null;
      }
      return createChatThreadItem(
        threadInfo,
        messageStore,
        messageInfos,
        sidebarInfos[threadInfo.id],
      );
    },
  );

function useChatThreadItem(
  threadInfo: ?LegacyThreadInfo | ?MinimallyEncodedThreadInfo,
): ?ChatThreadItem {
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
export { useChatThreadItem, activeChatThreadItem };
