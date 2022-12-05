// @flow

import invariant from 'invariant';
import _filter from 'lodash/fp/filter';
import _flow from 'lodash/fp/flow';
import _map from 'lodash/fp/map';
import _orderBy from 'lodash/fp/orderBy';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { createObjectSelector } from 'reselect-map';

import {
  messageKey,
  robotextForMessageInfo,
  createMessageInfo,
  getMostRecentNonLocalMessageID,
  sortMessageInfoList,
} from '../shared/message-utils';
import {
  threadIsPending,
  threadIsTopLevel,
  threadInChatList,
} from '../shared/thread-utils';
import {
  type MessageInfo,
  type MessageStore,
  type ComposableMessageInfo,
  type ReactionMessageInfo,
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
  threadTypes,
} from '../types/thread-types';
import type { UserInfo, AccountUserInfo } from '../types/user-types';
import { threeDays } from '../utils/date-utils';
import memoize2 from '../utils/memoize';
import {
  threadInfoSelector,
  sidebarInfoSelector,
  threadInfoFromSourceMessageIDSelector,
} from './thread-selectors';

export type SidebarItem =
  | {
      ...SidebarInfo,
      +type: 'sidebar',
    }
  | {
      +type: 'seeMore',
      +unread: boolean,
    }
  | { +type: 'spacer' };

export type ChatThreadItem = {
  +type: 'chatThreadItem',
  +threadInfo: ThreadInfo,
  +mostRecentMessageInfo: ?MessageInfo,
  +mostRecentNonLocalMessage: ?string,
  +lastUpdatedTime: number,
  +lastUpdatedTimeIncludingSidebars: number,
  +sidebars: $ReadOnlyArray<SidebarItem>,
  +pendingPersonalThreadUserInfo?: UserInfo,
};

const messageInfoSelector: (
  state: BaseAppState<*>,
) => { +[id: string]: ?MessageInfo } = createObjectSelector(
  (state: BaseAppState<*>) => state.messageStore.messages,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userStore.userInfos,
  threadInfoSelector,
  createMessageInfo,
);

function isEmptyMediaMessage(messageInfo: MessageInfo): boolean {
  return (
    (messageInfo.type === messageTypes.MULTIMEDIA ||
      messageInfo.type === messageTypes.IMAGES) &&
    messageInfo.media.length === 0
  );
}

function getMostRecentMessageInfo(
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
  messages: { +[id: string]: ?MessageInfo },
): ?MessageInfo {
  const thread = messageStore.threads[threadInfo.id];
  if (!thread) {
    return null;
  }
  for (const messageID of thread.messageIDs) {
    const messageInfo = messages[messageID];
    if (!messageInfo || isEmptyMediaMessage(messageInfo)) {
      continue;
    }
    return messageInfo;
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
  messages: { +[id: string]: ?MessageInfo },
  sidebarInfos: ?$ReadOnlyArray<SidebarInfo>,
): ChatThreadItem {
  const mostRecentMessageInfo = getMostRecentMessageInfo(
    threadInfo,
    messageStore,
    messages,
  );
  const mostRecentNonLocalMessage = getMostRecentNonLocalMessageID(
    threadInfo.id,
    messageStore,
  );
  const lastUpdatedTime = getLastUpdatedTime(threadInfo, mostRecentMessageInfo);

  const sidebars = sidebarInfos ?? [];
  const allSidebarItems = sidebars.map(sidebarInfo => ({
    type: 'sidebar',
    ...sidebarInfo,
  }));
  const lastUpdatedTimeIncludingSidebars =
    allSidebarItems.length > 0
      ? Math.max(lastUpdatedTime, allSidebarItems[0].lastUpdatedTime)
      : lastUpdatedTime;

  const numUnreadSidebars = allSidebarItems.filter(
    sidebar => sidebar.threadInfo.currentUser.unread,
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

  const numReadButRecentSidebars = allSidebarItems.filter(
    sidebar =>
      !sidebar.threadInfo.currentUser.unread &&
      sidebar.lastUpdatedTime > threeDaysAgo,
  ).length;
  if (
    sidebarItems.length < numUnreadSidebars + numReadButRecentSidebars ||
    (sidebarItems.length < allSidebarItems.length && sidebarItems.length > 0)
  ) {
    sidebarItems.push({
      type: 'seeMore',
      unread: numUnreadSidebars > maxUnreadSidebars,
    });
  }
  if (sidebarItems.length !== 0) {
    sidebarItems.push({
      type: 'spacer',
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
) => $ReadOnlyArray<ChatThreadItem> = createSelector(
  threadInfoSelector,
  (state: BaseAppState<*>) => state.messageStore,
  messageInfoSelector,
  sidebarInfoSelector,
  (
    threadInfos: { +[id: string]: ThreadInfo },
    messageStore: MessageStore,
    messageInfos: { +[id: string]: ?MessageInfo },
    sidebarInfos: { +[id: string]: $ReadOnlyArray<SidebarInfo> },
  ): $ReadOnlyArray<ChatThreadItem> =>
    getChatThreadItems(
      threadInfos,
      messageStore,
      messageInfos,
      sidebarInfos,
      threadIsTopLevel,
    ),
);

function useFlattenedChatListData(): $ReadOnlyArray<ChatThreadItem> {
  return useFilteredChatListData(threadInChatList);
}

function useFilteredChatListData(
  filterFunction: (threadInfo: ?(ThreadInfo | RawThreadInfo)) => boolean,
): $ReadOnlyArray<ChatThreadItem> {
  const threadInfos = useSelector(threadInfoSelector);
  const messageInfos = useSelector(messageInfoSelector);
  const sidebarInfos = useSelector(sidebarInfoSelector);
  const messageStore = useSelector(state => state.messageStore);

  return React.useMemo(
    () =>
      getChatThreadItems(
        threadInfos,
        messageStore,
        messageInfos,
        sidebarInfos,
        filterFunction,
      ),
    [messageInfos, messageStore, sidebarInfos, filterFunction, threadInfos],
  );
}

function getChatThreadItems(
  threadInfos: { +[id: string]: ThreadInfo },
  messageStore: MessageStore,
  messageInfos: { +[id: string]: ?MessageInfo },
  sidebarInfos: { +[id: string]: $ReadOnlyArray<SidebarInfo> },
  filterFunction: (threadInfo: ?(ThreadInfo | RawThreadInfo)) => boolean,
): $ReadOnlyArray<ChatThreadItem> {
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

export type RobotextChatMessageInfoItem = {
  +itemType: 'message',
  +messageInfo: RobotextMessageInfo,
  +startsConversation: boolean,
  +startsCluster: boolean,
  endsCluster: boolean,
  +robotext: string,
  +threadCreatedFromMessage: ?ThreadInfo,
  +reactions?: $ReadOnlyArray<ReactionMessageInfo>,
};
export type ChatMessageInfoItem =
  | RobotextChatMessageInfoItem
  | {
      +itemType: 'message',
      +messageInfo: ComposableMessageInfo,
      +localMessageInfo: ?LocalMessageInfo,
      +startsConversation: boolean,
      +startsCluster: boolean,
      endsCluster: boolean,
      +threadCreatedFromMessage: ?ThreadInfo,
      +reactions?: $ReadOnlyArray<ReactionMessageInfo>,
    };
export type ChatMessageItem = { itemType: 'loader' } | ChatMessageInfoItem;
const msInFiveMinutes = 5 * 60 * 1000;
function createChatMessageItems(
  threadID: string,
  messageStore: MessageStore,
  messageInfos: { +[id: string]: ?MessageInfo },
  threadInfos: { +[id: string]: ThreadInfo },
  threadInfoFromSourceMessageID: { +[id: string]: ThreadInfo },
  additionalMessages: $ReadOnlyArray<MessageInfo>,
): ChatMessageItem[] {
  const thread = messageStore.threads[threadID];

  const threadMessageInfos = (thread?.messageIDs ?? [])
    .map((messageID: string) => messageInfos[messageID])
    .filter(Boolean);
  const messages =
    additionalMessages.length > 0
      ? sortMessageInfoList([...threadMessageInfos, ...additionalMessages])
      : threadMessageInfos;

  const reactionsMap = new Map<string, Array<ReactionMessageInfo>>();

  for (let i = 0; i < messages.length; i++) {
    const messageInfo = messages[i];
    if (messageInfo.type !== messageTypes.REACTION) {
      continue;
    }

    if (reactionsMap.has(messageInfo.targetMessageID)) {
      reactionsMap.get(messageInfo.targetMessageID)?.push(messageInfo);
    } else {
      reactionsMap.set(messageInfo.targetMessageID, [messageInfo]);
    }
  }

  const chatMessageItems = [];
  let lastMessageInfo = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageInfo = messages[i];

    if (messageInfo.type === messageTypes.REACTION) {
      continue;
    }

    const originalMessageInfo =
      messageInfo.type === messageTypes.SIDEBAR_SOURCE
        ? messageInfo.sourceMessage
        : messageInfo;

    if (isEmptyMediaMessage(originalMessageInfo)) {
      continue;
    }

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
    const threadCreatedFromMessage =
      messageInfo.id && threadInfos[threadID]?.type !== threadTypes.SIDEBAR
        ? threadInfoFromSourceMessageID[messageInfo.id]
        : undefined;
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

      let reactions;
      if (originalMessageInfo.id) {
        reactions = reactionsMap.get(originalMessageInfo.id);
      }

      chatMessageItems.push({
        itemType: 'message',
        messageInfo: originalMessageInfo,
        localMessageInfo,
        startsConversation,
        startsCluster,
        endsCluster: false,
        threadCreatedFromMessage,
        reactions,
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
        threadCreatedFromMessage,
        robotext,
        reactions: reactionsMap.get(originalMessageInfo.id),
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
  const hideSpinner = thread ? thread.startReached : threadIsPending(threadID);
  if (hideSpinner) {
    return chatMessageItems;
  }
  return [...chatMessageItems, ({ itemType: 'loader' }: ChatMessageItem)];
}

const baseMessageListData = (
  threadID: ?string,
  additionalMessages: $ReadOnlyArray<MessageInfo>,
) =>
  createSelector(
    (state: BaseAppState<*>) => state.messageStore,
    messageInfoSelector,
    threadInfoSelector,
    threadInfoFromSourceMessageIDSelector,
    (
      messageStore: MessageStore,
      messageInfos: { +[id: string]: ?MessageInfo },
      threadInfos: { +[id: string]: ThreadInfo },
      threadInfoFromSourceMessageID: { +[id: string]: ThreadInfo },
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
        additionalMessages,
      );
    },
  );
type MessageListData = ?(ChatMessageItem[]);
const messageListData: (
  threadID: ?string,
  additionalMessages: $ReadOnlyArray<MessageInfo>,
) => (state: BaseAppState<*>) => MessageListData = memoize2(
  baseMessageListData,
);

type UseMessageListDataArgs = {
  +searching: boolean,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +threadInfo: ?ThreadInfo,
};

function useMessageListData({
  searching,
  userInfoInputArray,
  threadInfo,
}: UseMessageListDataArgs): MessageListData {
  const pendingSidebarSourceMessageInfo = useSelector(state => {
    const sourceMessageID = threadInfo?.sourceMessageID;
    if (
      !threadInfo ||
      threadInfo.type !== threadTypes.SIDEBAR ||
      !sourceMessageID
    ) {
      return null;
    }
    const thread = state.messageStore.threads[threadInfo.id];
    const messageInfos = messageInfoSelector(state);
    const shouldSourceBeAdded =
      !thread ||
      (thread.startReached &&
        thread.messageIDs.every(
          id => messageInfos[id]?.type !== messageTypes.SIDEBAR_SOURCE,
        ));
    return shouldSourceBeAdded ? messageInfos[sourceMessageID] : null;
  });

  invariant(
    !pendingSidebarSourceMessageInfo ||
      pendingSidebarSourceMessageInfo.type !== messageTypes.SIDEBAR_SOURCE,
    'sidebars can not be created from sidebar_source message',
  );

  const additionalMessages = React.useMemo(
    () =>
      pendingSidebarSourceMessageInfo ? [pendingSidebarSourceMessageInfo] : [],
    [pendingSidebarSourceMessageInfo],
  );
  const boundMessageListData = useSelector(
    messageListData(threadInfo?.id, additionalMessages),
  );

  return React.useMemo(() => {
    if (searching && userInfoInputArray.length === 0) {
      return [];
    }
    return boundMessageListData;
  }, [searching, userInfoInputArray.length, boundMessageListData]);
}

export {
  messageInfoSelector,
  createChatThreadItem,
  chatListData,
  createChatMessageItems,
  messageListData,
  useFlattenedChatListData,
  useFilteredChatListData,
  useMessageListData,
};
