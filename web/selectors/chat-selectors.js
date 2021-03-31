// @flow

import invariant from 'invariant';
import { createSelector } from 'reselect';

import {
  messageInfoSelector,
  type ChatThreadItem,
  createChatThreadItem,
  chatListData,
} from 'lib/selectors/chat-selectors';
import {
  threadInfoSelector,
  sidebarInfoSelector,
} from 'lib/selectors/thread-selectors';
import { threadIsPending } from 'lib/shared/thread-utils';
import type { MessageStore, MessageInfo } from 'lib/types/message-types';
import {
  type ThreadInfo,
  threadTypes,
  type SidebarInfo,
} from 'lib/types/thread-types';

import type { AppState } from '../redux/redux-setup';

const activeChatThreadItem: (
  state: AppState,
) => ?ChatThreadItem = createSelector(
  threadInfoSelector,
  (state: AppState) => state.messageStore,
  messageInfoSelector,
  (state: AppState) => state.navInfo.activeChatThreadID,
  (state: AppState) => state.navInfo.pendingThread,
  sidebarInfoSelector,
  (
    threadInfos: { [id: string]: ThreadInfo },
    messageStore: MessageStore,
    messageInfos: { [id: string]: MessageInfo },
    activeChatThreadID: ?string,
    pendingThreadInfo: ?ThreadInfo,
    sidebarInfos: { [id: string]: $ReadOnlyArray<SidebarInfo> },
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

const webChatListData: (state: AppState) => ChatThreadItem[] = createSelector(
  chatListData,
  activeChatThreadItem,
  (data: ChatThreadItem[], activeItem: ?ChatThreadItem): ChatThreadItem[] => {
    if (!activeItem) {
      return data;
    }

    const result = [];
    for (const item of data) {
      if (item.threadInfo.id === activeItem.threadInfo.id) {
        return data;
      }
      if (
        activeItem.threadInfo.type !== threadTypes.SIDEBAR ||
        activeItem.threadInfo.parentThreadID !== item.threadInfo.id
      ) {
        result.push(item);
        continue;
      }

      const { parentThreadID } = activeItem.threadInfo;
      invariant(
        parentThreadID,
        `thread ID ${activeItem.threadInfo.id} is a sidebar without a parent`,
      );

      for (const sidebarItem of item.sidebars) {
        if (sidebarItem.type !== 'sidebar') {
          continue;
        } else if (sidebarItem.threadInfo.id === activeItem.threadInfo.id) {
          return data;
        }
      }

      let indexToInsert = item.sidebars.findIndex(
        (sidebar) =>
          sidebar.lastUpdatedTime === undefined ||
          sidebar.lastUpdatedTime < activeItem.lastUpdatedTime,
      );
      if (indexToInsert === -1) {
        indexToInsert = item.sidebars.length;
      }
      const activeSidebar = {
        type: 'sidebar',
        lastUpdatedTime: activeItem.lastUpdatedTime,
        mostRecentNonLocalMessage: activeItem.mostRecentNonLocalMessage,
        threadInfo: activeItem.threadInfo,
      };
      const newSidebarItems = [
        ...item.sidebars.slice(0, indexToInsert),
        activeSidebar,
        ...item.sidebars.slice(indexToInsert),
      ];

      result.push({
        ...item,
        sidebars: newSidebarItems,
      });
    }

    if (activeItem.threadInfo.type !== threadTypes.SIDEBAR) {
      result.unshift(activeItem);
    }

    return result;
  },
);

export { webChatListData, activeChatThreadItem };
