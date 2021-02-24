// @flow

import invariant from 'invariant';
import { createSelector } from 'reselect';

import {
  messageInfoSelector,
  type ChatThreadItem,
  createChatThreadItem,
  chatListData,
  type ChatMessageItem,
  createChatMessageItems,
} from 'lib/selectors/chat-selectors';
import {
  threadInfoSelector,
  threadInfoFromSourceMessageIDSelector,
} from 'lib/selectors/thread-selectors';
import { threadIsPending } from 'lib/shared/thread-utils';
import type { MessageStore, MessageInfo } from 'lib/types/message-types';
import { type ThreadInfo, threadTypes } from 'lib/types/thread-types';

import type { AppState } from '../redux/redux-setup';

const activeChatThreadItem: (
  state: AppState,
) => ?ChatThreadItem = createSelector(
  threadInfoSelector,
  (state: AppState) => state.messageStore,
  messageInfoSelector,
  (state: AppState) => state.navInfo.activeChatThreadID,
  (state: AppState) => state.navInfo.pendingThread,
  (
    threadInfos: { [id: string]: ThreadInfo },
    messageStore: MessageStore,
    messageInfos: { [id: string]: MessageInfo },
    activeChatThreadID: ?string,
    pendingThreadInfo: ?ThreadInfo,
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
    return createChatThreadItem(threadInfo, messageStore, messageInfos, null);
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

const webMessageListData: (
  state: AppState,
) => ?(ChatMessageItem[]) = createSelector(
  (state: AppState) => state.navInfo.activeChatThreadID,
  (state: AppState) => state.messageStore,
  messageInfoSelector,
  threadInfoSelector,
  threadInfoFromSourceMessageIDSelector,
  (
    threadID: ?string,
    messageStore: MessageStore,
    messageInfos: { [id: string]: MessageInfo },
    threadInfos: { [id: string]: ThreadInfo },
    threadInfoFromSourceMessageID: { [id: string]: ThreadInfo },
  ): ?(ChatMessageItem[]) => {
    if (!threadID) {
      return null;
    }
    return createChatMessageItems(
      threadID,
      messageStore,
      messageInfos,
      threadInfos,
      threadInfoFromSourceMessageID,
    );
  },
);

export { webChatListData, webMessageListData, activeChatThreadItem };
