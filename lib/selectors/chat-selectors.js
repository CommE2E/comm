// @flow

import invariant from 'invariant';
import _filter from 'lodash/fp/filter';
import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _orderBy from 'lodash/fp/orderBy';
import _memoize from 'lodash/memoize';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { createObjectSelector } from 'reselect-map';

import {
  messageKey,
  robotextForMessageInfo,
  createMessageInfo,
  getMostRecentNonLocalMessageID,
} from '../shared/message-utils';
import { threadIsTopLevel, threadInChatList } from '../shared/thread-utils';
import {
  type MessageInfo,
  type MessageStore,
  type ComposableMessageInfo,
  type RobotextMessageInfo,
  type LocalMessageInfo,
  messageTypes,
  isComposableMessageType,
} from '../types/message-types';
import type { BaseAppState } from '../types/redux-types';
import {
  type ThreadInfo,
  type RawThreadInfo,
  type SidebarInfo,
  maxReadSidebars,
  maxUnreadSidebars,
} from '../types/thread-types';
import type { UserInfo } from '../types/user-types';
import { threeDays } from '../utils/date-utils';
import { threadInfoSelector, sidebarInfoSelector } from './thread-selectors';

type SidebarItem =
  | {|
      ...SidebarInfo,
      +type: 'sidebar',
    |}
  | {|
      +type: 'seeMore',
      +unread: boolean,
      +showingSidebarsInline: boolean,
    |};

export type ChatThreadItem = {|
  +type: 'chatThreadItem',
  +threadInfo: ThreadInfo,
  +mostRecentMessageInfo: ?MessageInfo,
  +mostRecentNonLocalMessage: ?string,
  +lastUpdatedTime: number,
  +lastUpdatedTimeIncludingSidebars: number,
  +sidebars: $ReadOnlyArray<SidebarItem>,
  +pendingPersonalThreadUserInfo?: UserInfo,
|};

const messageInfoSelector: (
  state: BaseAppState<*>,
) => { [id: string]: MessageInfo } = createObjectSelector(
  (state: BaseAppState<*>) => state.messageStore.messages,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userStore.userInfos,
  threadInfoSelector,
  createMessageInfo,
);

function getMostRecentMessageInfo(
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
  messages: { [id: string]: MessageInfo },
): ?MessageInfo {
  const thread = messageStore.threads[threadInfo.id];
  if (!thread) {
    return null;
  }
  for (let messageID of thread.messageIDs) {
    return messages[messageID];
  }
  return null;
}

function getLastUpdatedTime(
  threadInfo: ThreadInfo,
  mostRecentMessageInfo: ?MessageInfo,
): number {
  return mostRecentMessageInfo
    ? mostRecentMessageInfo.time
    : threadInfo.creationTime;
}

function createChatThreadItem(
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
  messages: { [id: string]: MessageInfo },
  sidebarInfos: ?$ReadOnlyArray<SidebarInfo>,
): ChatThreadItem {
  const mostRecentMessageInfo = getMostRecentMessageInfo(
    threadInfo,
    messageStore,
    messages,
  );
  const mostRecentNonLocalMessage = getMostRecentNonLocalMessageID(
    threadInfo,
    messageStore,
  );
  const lastUpdatedTime = getLastUpdatedTime(threadInfo, mostRecentMessageInfo);

  const sidebars = sidebarInfos ?? [];
  const allSidebarItems = sidebars.map((sidebarInfo) => ({
    type: 'sidebar',
    ...sidebarInfo,
  }));
  const lastUpdatedTimeIncludingSidebars =
    allSidebarItems.length > 0
      ? Math.max(lastUpdatedTime, allSidebarItems[0].lastUpdatedTime)
      : lastUpdatedTime;

  const numUnreadSidebars = allSidebarItems.filter(
    (sidebar) => sidebar.threadInfo.currentUser.unread,
  ).length;
  let numReadSidebarsToShow = maxReadSidebars - numUnreadSidebars;
  const threeDaysAgo = Date.now() - threeDays;

  const sidebarItems = [];
  for (const sidebar of allSidebarItems) {
    if (sidebarItems.length >= maxUnreadSidebars) {
      break;
    } else if (sidebar.threadInfo.currentUser.unread) {
      sidebarItems.push(sidebar);
    } else if (
      sidebar.lastUpdatedTime > threeDaysAgo &&
      numReadSidebarsToShow > 0
    ) {
      sidebarItems.push(sidebar);
      numReadSidebarsToShow--;
    }
  }

  if (sidebarItems.length < allSidebarItems.length) {
    sidebarItems.push({
      type: 'seeMore',
      unread: numUnreadSidebars > maxUnreadSidebars,
      showingSidebarsInline: sidebarItems.length !== 0,
    });
  }

  return {
    type: 'chatThreadItem',
    threadInfo,
    mostRecentMessageInfo,
    mostRecentNonLocalMessage,
    lastUpdatedTime,
    lastUpdatedTimeIncludingSidebars,
    sidebars: sidebarItems,
  };
}

const chatListData: (
  state: BaseAppState<*>,
) => ChatThreadItem[] = createSelector(
  threadInfoSelector,
  (state: BaseAppState<*>) => state.messageStore,
  messageInfoSelector,
  sidebarInfoSelector,
  (
    threadInfos: { [id: string]: ThreadInfo },
    messageStore: MessageStore,
    messageInfos: { [id: string]: MessageInfo },
    sidebarInfos: { [id: string]: $ReadOnlyArray<SidebarInfo> },
  ): ChatThreadItem[] =>
    getChatThreadItems(
      threadInfos,
      messageStore,
      messageInfos,
      sidebarInfos,
      threadIsTopLevel,
    ),
);

function useFlattenedChatListData(): ChatThreadItem[] {
  const threadInfos = useSelector(threadInfoSelector);
  const messageInfos = useSelector(messageInfoSelector);
  const sidebarInfos = useSelector(sidebarInfoSelector);
  const messageStore = useSelector((state) => state.messageStore);

  return React.useMemo(
    () =>
      getChatThreadItems(
        threadInfos,
        messageStore,
        messageInfos,
        sidebarInfos,
        threadInChatList,
      ),
    [messageInfos, messageStore, sidebarInfos, threadInfos],
  );
}

function getChatThreadItems(
  threadInfos: { [id: string]: ThreadInfo },
  messageStore: MessageStore,
  messageInfos: { [id: string]: MessageInfo },
  sidebarInfos: { [id: string]: $ReadOnlyArray<SidebarInfo> },
  filterFunction: (threadInfo: ?(ThreadInfo | RawThreadInfo)) => boolean,
): ChatThreadItem[] {
  return _flow(
    _filter(filterFunction),
    _map((threadInfo: ThreadInfo): ChatThreadItem =>
      createChatThreadItem(
        threadInfo,
        messageStore,
        messageInfos,
        sidebarInfos[threadInfo.id],
      ),
    ),
    _orderBy('lastUpdatedTimeIncludingSidebars')('desc'),
  )(threadInfos);
}

export type RobotextChatMessageInfoItem = {|
  itemType: 'message',
  messageInfo: RobotextMessageInfo,
  startsConversation: boolean,
  startsCluster: boolean,
  endsCluster: boolean,
  robotext: string,
|};
export type ChatMessageInfoItem =
  | RobotextChatMessageInfoItem
  | {|
      itemType: 'message',
      messageInfo: ComposableMessageInfo,
      localMessageInfo: ?LocalMessageInfo,
      startsConversation: boolean,
      startsCluster: boolean,
      endsCluster: boolean,
    |};
export type ChatMessageItem = {| itemType: 'loader' |} | ChatMessageInfoItem;
const msInFiveMinutes = 5 * 60 * 1000;
function createChatMessageItems(
  threadID: string,
  messageStore: MessageStore,
  messageInfos: { [id: string]: MessageInfo },
  threadInfos: { [id: string]: ThreadInfo },
): ChatMessageItem[] {
  const thread = messageStore.threads[threadID];
  if (!thread) {
    return [];
  }
  const threadMessageInfos = thread.messageIDs
    .map((messageID: string) => messageInfos[messageID])
    .filter(Boolean);
  const chatMessageItems = [];
  let lastMessageInfo = null;
  for (let i = threadMessageInfos.length - 1; i >= 0; i--) {
    const messageInfo = threadMessageInfos[i];
    const originalMessageInfo =
      messageInfo.type === messageTypes.SIDEBAR_SOURCE
        ? messageInfo.initialMessage
        : messageInfo;
    let startsConversation = true;
    let startsCluster = true;
    if (
      lastMessageInfo &&
      lastMessageInfo.time + msInFiveMinutes > originalMessageInfo.time
    ) {
      startsConversation = false;
      if (
        isComposableMessageType(lastMessageInfo.type) &&
        isComposableMessageType(originalMessageInfo.type) &&
        lastMessageInfo.creator.id === originalMessageInfo.creator.id
      ) {
        startsCluster = false;
      }
    }
    if (startsCluster && chatMessageItems.length > 0) {
      const lastMessageItem = chatMessageItems[chatMessageItems.length - 1];
      invariant(lastMessageItem.itemType === 'message', 'should be message');
      lastMessageItem.endsCluster = true;
    }
    if (isComposableMessageType(originalMessageInfo.type)) {
      // We use these invariants instead of just checking the messageInfo.type
      // directly in the conditional above so that isComposableMessageType can
      // be the source of truth
      invariant(
        originalMessageInfo.type === messageTypes.TEXT ||
          originalMessageInfo.type === messageTypes.IMAGES ||
          originalMessageInfo.type === messageTypes.MULTIMEDIA,
        "Flow doesn't understand isComposableMessageType above",
      );
      const localMessageInfo =
        messageStore.local[messageKey(originalMessageInfo)];
      chatMessageItems.push({
        itemType: 'message',
        messageInfo: originalMessageInfo,
        localMessageInfo,
        startsConversation,
        startsCluster,
        endsCluster: false,
      });
    } else {
      invariant(
        originalMessageInfo.type !== messageTypes.TEXT &&
          originalMessageInfo.type !== messageTypes.IMAGES &&
          originalMessageInfo.type !== messageTypes.MULTIMEDIA,
        "Flow doesn't understand isComposableMessageType above",
      );
      const robotext = robotextForMessageInfo(
        originalMessageInfo,
        threadInfos[threadID],
      );
      chatMessageItems.push({
        itemType: 'message',
        messageInfo: originalMessageInfo,
        startsConversation,
        startsCluster,
        endsCluster: false,
        robotext,
      });
    }
    lastMessageInfo = originalMessageInfo;
  }
  if (chatMessageItems.length > 0) {
    const lastMessageItem = chatMessageItems[chatMessageItems.length - 1];
    invariant(lastMessageItem.itemType === 'message', 'should be message');
    lastMessageItem.endsCluster = true;
  }
  chatMessageItems.reverse();
  if (thread.startReached) {
    return chatMessageItems;
  }
  return [...chatMessageItems, ({ itemType: 'loader' }: ChatMessageItem)];
}

const baseMessageListData = (threadID: string) =>
  createSelector(
    (state: BaseAppState<*>) => state.messageStore,
    messageInfoSelector,
    threadInfoSelector,
    (
      messageStore: MessageStore,
      messageInfos: { [id: string]: MessageInfo },
      threadInfos: { [id: string]: ThreadInfo },
    ): ChatMessageItem[] =>
      createChatMessageItems(threadID, messageStore, messageInfos, threadInfos),
  );
const messageListData: (
  threadID: string,
) => (state: BaseAppState<*>) => ChatMessageItem[] = _memoize(
  baseMessageListData,
);

export {
  messageInfoSelector,
  createChatThreadItem,
  chatListData,
  createChatMessageItems,
  messageListData,
  useFlattenedChatListData,
};
