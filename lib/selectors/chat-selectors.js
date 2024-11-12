// @flow

import invariant from 'invariant';
import _filter from 'lodash/fp/filter.js';
import _flow from 'lodash/fp/flow.js';
import _map from 'lodash/fp/map.js';
import _orderBy from 'lodash/fp/orderBy.js';
import * as React from 'react';
import { createSelector } from 'reselect';
import { createObjectSelector } from 'reselect-map';

import {
  threadInfoFromSourceMessageIDSelector,
  threadInfoSelector,
} from './thread-selectors.js';
import { useSidebarInfos } from '../hooks/sidebar-hooks.js';
import {
  createMessageInfo,
  getMostRecentNonLocalMessageID,
  messageKey,
  robotextForMessageInfo,
  sortMessageInfoList,
} from '../shared/message-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import { threadInChatList, threadIsPending } from '../shared/thread-utils.js';
import { messageTypes } from '../types/message-types-enum.js';
import {
  type ComposableMessageInfo,
  isComposableMessageType,
  type LocalMessageInfo,
  type MessageInfo,
  type MessageStore,
  type RobotextMessageInfo,
} from '../types/message-types.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import { threadTypeIsSidebar } from '../types/thread-types-enum.js';
import {
  maxReadSidebars,
  maxUnreadSidebars,
  type SidebarInfo,
} from '../types/thread-types.js';
import type {
  AccountUserInfo,
  RelativeUserInfo,
  UserInfo,
} from '../types/user-types.js';
import { threeDays } from '../utils/date-utils.js';
import type { EntityText } from '../utils/entity-text.js';
import memoize2 from '../utils/memoize.js';
import { useSelector } from '../utils/redux-utils.js';

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
  +mostRecentNonLocalMessage: ?string,
  +lastUpdatedTime: number,
  +lastUpdatedTimeIncludingSidebars: number,
  +sidebars: $ReadOnlyArray<SidebarItem>,
  +pendingPersonalThreadUserInfo?: UserInfo,
};

const messageInfoSelector: (state: BaseAppState<>) => {
  +[id: string]: ?MessageInfo,
} = createObjectSelector(
  (state: BaseAppState<>) => state.messageStore.messages,
  (state: BaseAppState<>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<>) => state.userStore.userInfos,
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

function getLastUpdatedTime(
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
  messages: { +[id: string]: ?MessageInfo },
): number {
  const thread = messageStore.threads[threadInfo.id];
  if (!thread) {
    return threadInfo.creationTime;
  }
  for (const messageID of thread.messageIDs) {
    const messageInfo = messages[messageID];
    if (!messageInfo || isEmptyMediaMessage(messageInfo)) {
      continue;
    }
    return messageInfo.time;
  }
  return threadInfo.creationTime;
}

function useCreateChatThreadItem(): ThreadInfo => ChatThreadItem {
  const messageInfos = useSelector(messageInfoSelector);
  const sidebarInfos = useSidebarInfos();
  const messageStore = useSelector(state => state.messageStore);
  return React.useCallback(
    threadInfo => {
      const mostRecentNonLocalMessage = getMostRecentNonLocalMessageID(
        threadInfo.id,
        messageStore,
      );
      const lastUpdatedTime = getLastUpdatedTime(
        threadInfo,
        messageStore,
        messageInfos,
      );

      const sidebars = sidebarInfos[threadInfo.id] ?? [];
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

      const sidebarItems: SidebarItem[] = [];
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
        (sidebarItems.length < allSidebarItems.length &&
          sidebarItems.length > 0)
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
        mostRecentNonLocalMessage,
        lastUpdatedTime,
        lastUpdatedTimeIncludingSidebars,
        sidebars: sidebarItems,
      };
    },
    [messageInfos, messageStore, sidebarInfos],
  );
}

function useFlattenedChatListData(): $ReadOnlyArray<ChatThreadItem> {
  return useFilteredChatListData(threadInChatList);
}

function useFilteredChatListData(
  filterFunction: (threadInfo: ?(ThreadInfo | RawThreadInfo)) => boolean,
): $ReadOnlyArray<ChatThreadItem> {
  const threadInfos = useSelector(threadInfoSelector);
  const getChatThreadItem = useCreateChatThreadItem();
  return React.useMemo(
    () =>
      _flow(
        _filter(filterFunction),
        _map(getChatThreadItem),
        _orderBy('lastUpdatedTimeIncludingSidebars')('desc'),
      )(threadInfos),
    [getChatThreadItem, filterFunction, threadInfos],
  );
}

export type RobotextChatMessageInfoItem = {
  +itemType: 'message',
  +messageInfoType: 'robotext',
  +messageInfos: $ReadOnlyArray<RobotextMessageInfo>,
  +startsConversation: boolean,
  +startsCluster: boolean,
  endsCluster: boolean,
  +robotext: EntityText,
  +threadCreatedFromMessage: ?ThreadInfo,
  +reactions: ReactionInfo,
};
export type ComposableChatMessageInfoItem = {
  +itemType: 'message',
  +messageInfoType: 'composable',
  +messageInfo: ComposableMessageInfo,
  +localMessageInfo: ?LocalMessageInfo,
  +startsConversation: boolean,
  +startsCluster: boolean,
  endsCluster: boolean,
  +threadCreatedFromMessage: ?ThreadInfo,
  +reactions: ReactionInfo,
  +hasBeenEdited: boolean,
  +isPinned: boolean,
};
export type ChatMessageInfoItem =
  | RobotextChatMessageInfoItem
  | ComposableChatMessageInfoItem;
export type ChatMessageItem = { itemType: 'loader' } | ChatMessageInfoItem;

export type ReactionInfo = { +[reaction: string]: MessageReactionInfo };
type MessageReactionInfo = {
  +viewerReacted: boolean,
  +users: $ReadOnlyArray<RelativeUserInfo>,
};
type TargetMessageReactions = Map<string, Map<string, RelativeUserInfo>>;

const msInFiveMinutes = 5 * 60 * 1000;
function createChatMessageItems(
  threadID: string,
  messageStore: MessageStore,
  messageInfos: { +[id: string]: ?MessageInfo },
  threadInfos: { +[id: string]: ThreadInfo },
  threadInfoFromSourceMessageID: {
    +[id: string]: ThreadInfo,
  },
  additionalMessages: $ReadOnlyArray<MessageInfo>,
  viewerID: string,
): ChatMessageItem[] {
  const thread = messageStore.threads[threadID];

  const threadMessageInfos = (thread?.messageIDs ?? [])
    .map((messageID: string) => messageInfos[messageID])
    .filter(Boolean);
  const messages =
    additionalMessages.length > 0
      ? sortMessageInfoList([...threadMessageInfos, ...additionalMessages])
      : threadMessageInfos;

  const targetMessageReactionsMap = new Map<string, TargetMessageReactions>();

  // We need to iterate backwards to put the order of messages in chronological
  // order, starting with the oldest. This avoids the scenario where the most
  // recent message with the remove_reaction action may try to remove a user
  // that hasn't been added to the messageReactionUsersInfoMap, causing it
  // to be skipped.
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageInfo = messages[i];
    if (messageInfo.type !== messageTypes.REACTION) {
      continue;
    }

    if (!targetMessageReactionsMap.has(messageInfo.targetMessageID)) {
      const reactsMap: TargetMessageReactions = new Map();
      targetMessageReactionsMap.set(messageInfo.targetMessageID, reactsMap);
    }

    const messageReactsMap = targetMessageReactionsMap.get(
      messageInfo.targetMessageID,
    );
    invariant(messageReactsMap, 'messageReactsInfo should be set');

    if (!messageReactsMap.has(messageInfo.reaction)) {
      const usersInfoMap = new Map<string, RelativeUserInfo>();
      messageReactsMap.set(messageInfo.reaction, usersInfoMap);
    }

    const messageReactionUsersInfoMap = messageReactsMap.get(
      messageInfo.reaction,
    );
    invariant(
      messageReactionUsersInfoMap,
      'messageReactionUsersInfoMap should be set',
    );

    if (messageInfo.action === 'add_reaction') {
      messageReactionUsersInfoMap.set(
        messageInfo.creator.id,
        messageInfo.creator,
      );
    } else {
      messageReactionUsersInfoMap.delete(messageInfo.creator.id);
    }
  }

  const targetMessageEditMap = new Map<string, string>();
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageInfo = messages[i];
    if (messageInfo.type !== messageTypes.EDIT_MESSAGE) {
      continue;
    }
    targetMessageEditMap.set(messageInfo.targetMessageID, messageInfo.text);
  }

  const targetMessagePinStatusMap = new Map<string, boolean>();
  // Once again, we iterate backwards to put the order of messages in
  // chronological order (i.e. oldest to newest) to handle pinned messages.
  // This is important because we want to make sure that the most recent pin
  // action is the one that is used to determine whether a message
  // is pinned or not.
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageInfo = messages[i];
    if (messageInfo.type !== messageTypes.TOGGLE_PIN) {
      continue;
    }

    targetMessagePinStatusMap.set(
      messageInfo.targetMessageID,
      messageInfo.action === 'pin',
    );
  }

  const chatMessageItems: ChatMessageItem[] = [];
  let lastMessageInfo = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageInfo = messages[i];

    if (
      messageInfo.type === messageTypes.REACTION ||
      messageInfo.type === messageTypes.EDIT_MESSAGE
    ) {
      continue;
    }

    let originalMessageInfo =
      messageInfo.type === messageTypes.SIDEBAR_SOURCE
        ? messageInfo.sourceMessage
        : messageInfo;

    if (isEmptyMediaMessage(originalMessageInfo)) {
      continue;
    }

    let hasBeenEdited = false;
    if (
      originalMessageInfo.type === messageTypes.TEXT &&
      originalMessageInfo.id
    ) {
      const newText = targetMessageEditMap.get(originalMessageInfo.id);
      if (newText !== undefined) {
        hasBeenEdited = true;
        originalMessageInfo = {
          ...originalMessageInfo,
          text: newText,
        };
      }
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
      !threadTypeIsSidebar(threadInfos[threadID]?.type) && messageInfo.id
        ? threadInfoFromSourceMessageID[messageInfo.id]
        : undefined;

    const isPinned = !!(
      originalMessageInfo.id &&
      targetMessagePinStatusMap.get(originalMessageInfo.id)
    );

    const renderedReactions: ReactionInfo = (() => {
      const result: { [string]: MessageReactionInfo } = {};

      let messageReactsMap;
      if (originalMessageInfo.id) {
        messageReactsMap = targetMessageReactionsMap.get(
          originalMessageInfo.id,
        );
      }

      if (!messageReactsMap) {
        return result;
      }

      for (const reaction of messageReactsMap.keys()) {
        const reactionUsersInfoMap = messageReactsMap.get(reaction);
        invariant(reactionUsersInfoMap, 'reactionUsersInfoMap should be set');

        if (reactionUsersInfoMap.size === 0) {
          continue;
        }

        const reactionUserInfos = [...reactionUsersInfoMap.values()];

        const messageReactionInfo = {
          users: reactionUserInfos,
          viewerReacted: reactionUsersInfoMap.has(viewerID),
        };

        result[reaction] = messageReactionInfo;
      }

      return result;
    })();

    const threadInfo = threadInfos[threadID];
    const parentThreadInfo = threadInfo?.parentThreadID
      ? threadInfos[threadInfo.parentThreadID]
      : null;

    const lastChatMessageItem =
      chatMessageItems.length > 0
        ? chatMessageItems[chatMessageItems.length - 1]
        : undefined;
    const messageSpec = messageSpecs[originalMessageInfo.type];
    if (
      !threadCreatedFromMessage &&
      Object.keys(renderedReactions).length === 0 &&
      !hasBeenEdited &&
      !isPinned &&
      lastChatMessageItem &&
      lastChatMessageItem.itemType === 'message' &&
      lastChatMessageItem.messageInfoType === 'robotext' &&
      !lastChatMessageItem.threadCreatedFromMessage &&
      Object.keys(lastChatMessageItem.reactions).length === 0 &&
      !isComposableMessageType(originalMessageInfo.type) &&
      messageSpec?.mergeIntoPrecedingRobotextMessageItem
    ) {
      const { mergeIntoPrecedingRobotextMessageItem } = messageSpec;
      const mergeResult = mergeIntoPrecedingRobotextMessageItem(
        originalMessageInfo,
        lastChatMessageItem,
        { threadInfo, parentThreadInfo },
      );
      if (mergeResult.shouldMerge) {
        chatMessageItems[chatMessageItems.length - 1] = mergeResult.item;
        continue;
      }
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
        messageInfoType: 'composable',
        messageInfo: originalMessageInfo,
        localMessageInfo,
        startsConversation,
        startsCluster,
        endsCluster: false,
        threadCreatedFromMessage,
        reactions: renderedReactions,
        hasBeenEdited,
        isPinned,
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
        threadInfo,
        parentThreadInfo,
      );
      chatMessageItems.push({
        itemType: 'message',
        messageInfoType: 'robotext',
        messageInfos: [originalMessageInfo],
        startsConversation,
        startsCluster,
        endsCluster: false,
        threadCreatedFromMessage,
        robotext,
        reactions: renderedReactions,
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
): ((state: BaseAppState<>) => ?(ChatMessageItem[])) =>
  createSelector(
    (state: BaseAppState<>) => state.messageStore,
    messageInfoSelector,
    threadInfoSelector,
    threadInfoFromSourceMessageIDSelector,
    (state: BaseAppState<>) =>
      state.currentUserInfo && state.currentUserInfo.id,
    (
      messageStore: MessageStore,
      messageInfos: { +[id: string]: ?MessageInfo },
      threadInfos: {
        +[id: string]: ThreadInfo,
      },
      threadInfoFromSourceMessageID: {
        +[id: string]: ThreadInfo,
      },
      viewerID: ?string,
    ): ?(ChatMessageItem[]) => {
      if (!threadID || !viewerID) {
        return null;
      }
      return createChatMessageItems(
        threadID,
        messageStore,
        messageInfos,
        threadInfos,
        threadInfoFromSourceMessageID,
        additionalMessages,
        viewerID,
      );
    },
  );
export type MessageListData = ?(ChatMessageItem[]);
const messageListData: (
  threadID: ?string,
  additionalMessages: $ReadOnlyArray<MessageInfo>,
) => (state: BaseAppState<>) => MessageListData = memoize2(baseMessageListData);

export type UseMessageListDataArgs = {
  +searching: boolean,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +threadInfo: ?ThreadInfo,
};

function useMessageListData({
  searching,
  userInfoInputArray,
  threadInfo,
}: UseMessageListDataArgs): MessageListData {
  const messageInfos = useSelector(messageInfoSelector);

  const containingThread = useSelector(state => {
    if (
      !threadInfo ||
      !threadTypeIsSidebar(threadInfo.type) ||
      !threadInfo.containingThreadID
    ) {
      return null;
    }
    return state.messageStore.threads[threadInfo.containingThreadID];
  });

  const pendingSidebarEditMessageInfo = React.useMemo(() => {
    const sourceMessageID = threadInfo?.sourceMessageID;
    const threadMessageInfos = (containingThread?.messageIDs ?? [])
      .map((messageID: string) => messageInfos[messageID])
      .filter(Boolean)
      .filter(
        message =>
          message.type === messageTypes.EDIT_MESSAGE &&
          message.targetMessageID === sourceMessageID,
      );
    if (threadMessageInfos.length === 0) {
      return null;
    }
    return threadMessageInfos[0];
  }, [threadInfo, containingThread, messageInfos]);

  const pendingSidebarSourceMessageInfo = useSelector(state => {
    const sourceMessageID = threadInfo?.sourceMessageID;
    if (
      !threadInfo ||
      !threadTypeIsSidebar(threadInfo.type) ||
      !sourceMessageID
    ) {
      return null;
    }
    const thread = state.messageStore.threads[threadInfo.id];
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

  const additionalMessages = React.useMemo(() => {
    if (!pendingSidebarSourceMessageInfo) {
      return ([]: MessageInfo[]);
    }
    const result: MessageInfo[] = [pendingSidebarSourceMessageInfo];
    if (pendingSidebarEditMessageInfo) {
      result.push(pendingSidebarEditMessageInfo);
    }
    return result;
  }, [pendingSidebarSourceMessageInfo, pendingSidebarEditMessageInfo]);
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
  useCreateChatThreadItem,
  createChatMessageItems,
  messageListData,
  useFlattenedChatListData,
  useFilteredChatListData,
  useMessageListData,
};
