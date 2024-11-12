// @flow

import invariant from 'invariant';
import _orderBy from 'lodash/fp/orderBy.js';
import * as React from 'react';
import { createSelector } from 'reselect';
import { createObjectSelector } from 'reselect-map';

import {
  threadInfoFromSourceMessageIDSelector,
  threadInfoSelector,
} from './thread-selectors.js';
import { useSidebarInfos } from '../hooks/sidebar-hooks.js';
import { useGetLastUpdatedTimes } from '../hooks/thread-time.js';
import {
  createMessageInfo,
  getMostRecentNonLocalMessageID,
  messageKey,
  robotextForMessageInfo,
  sortMessageInfoList,
} from '../shared/message-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import {
  getSidebarItems,
  getAllInitialSidebarItems,
  getAllFinalSidebarItems,
  type SidebarItem,
} from '../shared/sidebar-item-utils.js';
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
import type { SidebarInfo, LastUpdatedTimes } from '../types/thread-types.js';
import type {
  AccountUserInfo,
  RelativeUserInfo,
  UserInfo,
} from '../types/user-types.js';
import type { EntityText } from '../utils/entity-text.js';
import memoize2 from '../utils/memoize.js';
import { useSelector } from '../utils/redux-utils.js';

type ChatThreadItemBase = {
  +type: 'chatThreadItem',
  +threadInfo: ThreadInfo,
  +mostRecentNonLocalMessage: ?string,
  +sidebars: $ReadOnlyArray<SidebarItem>,
  +pendingPersonalThreadUserInfo?: UserInfo,
};
export type ChatThreadItem = $ReadOnly<{
  ...ChatThreadItemBase,
  +lastUpdatedTime: number,
  +lastUpdatedTimeIncludingSidebars: number,
}>;

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

type CreatedChatThreadItem = $ReadOnly<{
  ...ChatThreadItemBase,
  ...LastUpdatedTimes,
  +lastUpdatedTimeIncludingSidebars: Promise<number>,
  +lastUpdatedAtLeastTimeIncludingSidebars: number,
  +allSidebarInfos: $ReadOnlyArray<SidebarInfo>,
}>;
function useCreateChatThreadItem(): ThreadInfo => CreatedChatThreadItem {
  const messageInfos = useSelector(messageInfoSelector);
  const sidebarInfos = useSidebarInfos();
  const messageStore = useSelector(state => state.messageStore);
  const getLastUpdatedTimes = useGetLastUpdatedTimes();
  return React.useCallback(
    threadInfo => {
      const mostRecentNonLocalMessage = getMostRecentNonLocalMessageID(
        threadInfo.id,
        messageStore,
      );

      const { lastUpdatedTime, lastUpdatedAtLeastTime } = getLastUpdatedTimes(
        threadInfo,
        messageStore,
        messageInfos,
      );

      const sidebars = sidebarInfos[threadInfo.id] ?? [];
      const lastUpdatedAtLeastTimeIncludingSidebars =
        sidebars.length > 0
          ? Math.max(lastUpdatedAtLeastTime, sidebars[0].lastUpdatedAtLeastTime)
          : lastUpdatedAtLeastTime;

      const lastUpdatedTimeIncludingSidebars = (async () => {
        if (sidebars.length === 0) {
          return await lastUpdatedTime;
        }
        const [lastUpdatedTimeResult, sidebarLastUpdatedTimeResult] =
          await Promise.all([lastUpdatedTime, sidebars[0].lastUpdatedTime]);
        return Math.max(lastUpdatedTimeResult, sidebarLastUpdatedTimeResult);
      })();

      const allInitialSidebarItems = getAllInitialSidebarItems(sidebars);
      const sidebarItems = getSidebarItems(allInitialSidebarItems);

      return {
        type: 'chatThreadItem',
        threadInfo,
        mostRecentNonLocalMessage,
        lastUpdatedTime,
        lastUpdatedAtLeastTime,
        lastUpdatedTimeIncludingSidebars,
        lastUpdatedAtLeastTimeIncludingSidebars,
        sidebars: sidebarItems,
        allSidebarInfos: sidebars,
      };
    },
    [messageInfos, messageStore, sidebarInfos, getLastUpdatedTimes],
  );
}

function useFlattenedChatListData(): $ReadOnlyArray<ChatThreadItem> {
  return useFilteredChatListData(threadInChatList);
}

function useFilteredChatListData(
  filterFunction: (threadInfo: ?(ThreadInfo | RawThreadInfo)) => boolean,
): $ReadOnlyArray<ChatThreadItem> {
  const threadInfos = useSelector(threadInfoSelector);
  const filteredThreadInfos = React.useMemo(
    () => Object.values(threadInfos).filter(filterFunction),
    [threadInfos, filterFunction],
  );
  return useChatThreadItems(filteredThreadInfos);
}

const sortFunc = _orderBy('lastUpdatedTimeIncludingSidebars')('desc');
function useChatThreadItems(
  threadInfos: $ReadOnlyArray<ThreadInfo>,
): $ReadOnlyArray<ChatThreadItem> {
  const getChatThreadItem = useCreateChatThreadItem();
  const createdChatThreadItems = React.useMemo(
    () => threadInfos.map(getChatThreadItem),
    [threadInfos, getChatThreadItem],
  );

  const initialChatThreadItems = React.useMemo(
    () =>
      createdChatThreadItems.map(createdChatThreadItem => {
        const {
          allSidebarInfos,
          lastUpdatedTime,
          lastUpdatedAtLeastTime,
          lastUpdatedTimeIncludingSidebars,
          lastUpdatedAtLeastTimeIncludingSidebars,
          ...rest
        } = createdChatThreadItem;
        return {
          ...rest,
          lastUpdatedTime: lastUpdatedAtLeastTime,
          lastUpdatedTimeIncludingSidebars:
            lastUpdatedAtLeastTimeIncludingSidebars,
        };
      }),
    [createdChatThreadItems],
  );

  const [chatThreadItems, setChatThreadItems] = React.useState<
    $ReadOnlyArray<ChatThreadItem>,
  >(initialChatThreadItems);

  const prevCreatedChatThreadItemsRef = React.useRef(createdChatThreadItems);
  React.useEffect(() => {
    if (createdChatThreadItems === prevCreatedChatThreadItemsRef.current) {
      return;
    }
    prevCreatedChatThreadItemsRef.current = createdChatThreadItems;

    setChatThreadItems(initialChatThreadItems);

    void (async () => {
      const finalChatThreadItems = await Promise.all(
        createdChatThreadItems.map(async createdChatThreadItem => {
          const {
            allSidebarInfos,
            lastUpdatedTime: lastUpdatedTimePromise,
            lastUpdatedAtLeastTime,
            lastUpdatedTimeIncludingSidebars:
              lastUpdatedTimeIncludingSidebarsPromise,
            lastUpdatedAtLeastTimeIncludingSidebars,
            ...rest
          } = createdChatThreadItem;
          const [
            lastUpdatedTime,
            lastUpdatedTimeIncludingSidebars,
            allSidebarItems,
          ] = await Promise.all([
            lastUpdatedTimePromise,
            lastUpdatedTimeIncludingSidebarsPromise,
            getAllFinalSidebarItems(allSidebarInfos),
          ]);
          const sidebars = getSidebarItems(allSidebarItems);
          return {
            ...rest,
            lastUpdatedTime,
            lastUpdatedTimeIncludingSidebars,
            sidebars,
          };
        }),
      );
      if (createdChatThreadItems !== prevCreatedChatThreadItemsRef.current) {
        // If these aren't equal, it indicates that the effect has fired again.
        // We should discard this result as it is now outdated.
        return;
      }
      // The callback below is basically
      // setChatThreadItems(finalChatThreadItems), but it has extra logic to
      // preserve objects if they are unchanged.
      setChatThreadItems(prevChatThreadItems => {
        if (prevChatThreadItems.length !== finalChatThreadItems.length) {
          console.log(
            'unexpected: prevChatThreadItems.length !== ' +
              'finalChatThreadItems.length',
          );
          return finalChatThreadItems;
        }
        let somethingChanged = false;
        const result: Array<ChatThreadItem> = [];
        for (let i = 0; i < prevChatThreadItems.length; i++) {
          const prevChatThreadItem = prevChatThreadItems[i];
          const newChatThreadItem = finalChatThreadItems[i];
          if (
            prevChatThreadItem.threadInfo.id !== newChatThreadItem.threadInfo.id
          ) {
            console.log(
              'unexpected: prevChatThreadItem.threadInfo.id !== ' +
                'newChatThreadItem.threadInfo.id',
            );
            return finalChatThreadItems;
          }
          if (
            prevChatThreadItem.lastUpdatedTime !==
              newChatThreadItem.lastUpdatedTime ||
            prevChatThreadItem.lastUpdatedTimeIncludingSidebars !==
              newChatThreadItem.lastUpdatedTimeIncludingSidebars ||
            prevChatThreadItem.sidebars.length !==
              newChatThreadItem.sidebars.length
          ) {
            somethingChanged = true;
            result[i] = newChatThreadItem;
            continue;
          }
          const sidebarsMatching = prevChatThreadItem.sidebars.map(
            (prevSidebar, j) => {
              const newSidebar = newChatThreadItem.sidebars[j];
              if (
                newSidebar.type !== 'sidebar' ||
                prevSidebar.type !== 'sidebar'
              ) {
                return newSidebar.type === prevSidebar.type;
              }
              return newSidebar.threadInfo.id === prevSidebar.threadInfo.id;
            },
          );
          if (sidebarsMatching.includes(false)) {
            somethingChanged = true;
            result[i] = newChatThreadItem;
            continue;
          }
          result[i] = prevChatThreadItem;
        }
        if (somethingChanged) {
          return result;
        } else {
          return prevChatThreadItems;
        }
      });
    })();
  }, [createdChatThreadItems, initialChatThreadItems]);

  return React.useMemo(() => sortFunc(chatThreadItems), [chatThreadItems]);
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
  createChatMessageItems,
  messageListData,
  useFlattenedChatListData,
  useFilteredChatListData,
  useChatThreadItems,
  useMessageListData,
};
