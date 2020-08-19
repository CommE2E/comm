// @flow

import type { AppState } from '../redux/redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { MessageStore, MessageInfo } from 'lib/types/message-types';

import { createSelector } from 'reselect';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  messageInfoSelector,
  type ChatThreadItem,
  createChatThreadItem,
  chatListData,
  type ChatMessageItem,
  createChatMessageItems,
} from 'lib/selectors/chat-selectors';

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
    for (let item of data) {
      if (item.threadInfo.id === activeItem.threadInfo.id) {
        return data;
      }
    }
    return [activeItem, ...data];
  },
);

const webMessageListData: (
  state: AppState,
) => ?(ChatMessageItem[]) = createSelector(
  (state: AppState) => state.navInfo.activeChatThreadID,
  (state: AppState) => state.messageStore,
  messageInfoSelector,
  threadInfoSelector,
  (
    threadID: ?string,
    messageStore: MessageStore,
    messageInfos: { [id: string]: MessageInfo },
    threadInfos: { [id: string]: ThreadInfo },
  ): ?(ChatMessageItem[]) => {
    if (!threadID) {
      return null;
    }
    return createChatMessageItems(
      threadID,
      messageStore,
      messageInfos,
      threadInfos,
    );
  },
);

export { webChatListData, webMessageListData };
