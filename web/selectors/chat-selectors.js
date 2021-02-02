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
  (
    threadInfos: { [id: string]: ThreadInfo },
    messageStore: MessageStore,
    messageInfos: { [id: string]: MessageInfo },
    activeChatThreadID: ?string,
  ): ?ChatThreadItem => {
    if (!activeChatThreadID) {
      return null;
    }
    const threadInfo = threadInfos[activeChatThreadID];
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

      let newSidebarItemInserted = false;
      const newSidebarItems = [];
      for (const sidebarItem of item.sidebars) {
        if (
          !newSidebarItemInserted &&
          (sidebarItem.lastUpdatedTime === undefined ||
            sidebarItem.lastUpdatedTime < activeItem.lastUpdatedTime)
        ) {
          newSidebarItemInserted = true;
          newSidebarItems.push({
            type: 'sidebar',
            lastUpdatedTime: activeItem.lastUpdatedTime,
            mostRecentNonLocalMessage: activeItem.mostRecentNonLocalMessage,
            threadInfo: activeItem.threadInfo,
          });
        }
        newSidebarItems.push(sidebarItem);
      }
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

export { webChatListData, webMessageListData };
