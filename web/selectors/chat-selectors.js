// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { MessageStore } from 'lib/types/message-types';
import type { UserInfo } from 'lib/types/user-types';

import { createSelector } from 'reselect';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
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
  (state: AppState) => state.currentUserInfo && state.currentUserInfo.id,
  (state: AppState) => state.userInfos,
  (state: AppState) => state.navInfo.activeChatThreadID,
  (
    threadInfos: {[id: string]: ThreadInfo},
    messageStore: MessageStore,
    viewerID: ?string,
    userInfos: {[id: string]: UserInfo},
    activeChatThreadID: ?string,
  ): ?ChatThreadItem => {
    if (!activeChatThreadID) {
      return null;
    }
    const threadInfo = threadInfos[activeChatThreadID];
    if (!threadInfo) {
      return null;
    }
    return createChatThreadItem(
      threadInfo,
      threadInfos,
      messageStore,
      viewerID,
      userInfos,
    );
  },
);

const webChatListData: (
  state: AppState,
) => ChatThreadItem[] = createSelector(
  chatListData,
  activeChatThreadItem,
  (
    data: ChatThreadItem[],
    activeItem: ?ChatThreadItem,
  ): ChatThreadItem[] => {
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
) => ?ChatMessageItem[] = createSelector(
  (state: AppState) => state.navInfo.activeChatThreadID,
  (state: AppState) => state.messageStore,
  (state: AppState) => state.currentUserInfo && state.currentUserInfo.id,
  (state: AppState) => state.userInfos,
  threadInfoSelector,
  (
    threadID: ?string,
    messageStore: MessageStore,
    viewerID: ?string,
    userInfos: {[id: string]: UserInfo},
    threadInfos: {[id: string]: ThreadInfo},
  ): ?ChatMessageItem[] => {
    if (!threadID) {
      return null;
    }
    return createChatMessageItems(
      threadID,
      messageStore,
      viewerID,
      userInfos,
      threadInfos,
    );
  },
);

export {
  webChatListData,
  webMessageListData,
};
