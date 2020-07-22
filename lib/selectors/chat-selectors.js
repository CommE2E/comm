// @flow

import type { BaseAppState } from '../types/redux-types';
import {
  type ThreadInfo,
  threadInfoPropType,
  threadTypes,
} from '../types/thread-types';
import {
  type MessageInfo,
  type MessageStore,
  type ComposableMessageInfo,
  type RobotextMessageInfo,
  type LocalMessageInfo,
  messageInfoPropType,
  localMessageInfoPropType,
  messageTypes,
  isComposableMessageType,
} from '../types/message-types';

import { createSelector } from 'reselect';
import { createObjectSelector } from 'reselect-map';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _flow from 'lodash/fp/flow';
import _filter from 'lodash/fp/filter';
import _map from 'lodash/fp/map';
import _orderBy from 'lodash/fp/orderBy';
import _memoize from 'lodash/memoize';

import {
  messageKey,
  robotextForMessageInfo,
  createMessageInfo,
} from '../shared/message-utils';
import { threadInfoSelector, childThreadInfos } from './thread-selectors';
import { threadInChatList } from '../shared/thread-utils';

export type ChatThreadItem = {|
  +type: 'chatThreadItem',
  +threadInfo: ThreadInfo,
  +mostRecentMessageInfo: ?MessageInfo,
  +lastUpdatedTime: number,
  +lastUpdatedTimeIncludingSidebars: number,
  +sidebars: $ReadOnlyArray<{|
    +threadInfo: ThreadInfo,
    +lastUpdatedTime: number,
  |}>,
|};
const chatThreadItemPropType = PropTypes.exact({
  type: PropTypes.oneOf(['chatThreadItem']),
  threadInfo: threadInfoPropType.isRequired,
  mostRecentMessageInfo: messageInfoPropType,
  lastUpdatedTime: PropTypes.number.isRequired,
  lastUpdatedTimeIncludingSidebars: PropTypes.number.isRequired,
  sidebars: PropTypes.arrayOf(
    PropTypes.exact({
      threadInfo: threadInfoPropType.isRequired,
      lastUpdatedTime: PropTypes.number.isRequired,
    }),
  ).isRequired,
});

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
  childThreads: ?(ThreadInfo[]),
): ChatThreadItem {
  const mostRecentMessageInfo = getMostRecentMessageInfo(
    threadInfo,
    messageStore,
    messages,
  );
  const lastUpdatedTime = getLastUpdatedTime(threadInfo, mostRecentMessageInfo);

  const sidebars = [];
  let lastUpdatedTimeIncludingSidebars = lastUpdatedTime;
  if (childThreads) {
    for (const childThreadInfo of childThreads) {
      if (childThreadInfo.type !== threadTypes.SIDEBAR) {
        continue;
      }
      const sidebarLastUpdatedTime = getLastUpdatedTime(
        childThreadInfo,
        getMostRecentMessageInfo(childThreadInfo, messageStore, messages),
      );
      if (sidebarLastUpdatedTime > lastUpdatedTimeIncludingSidebars) {
        lastUpdatedTimeIncludingSidebars = sidebarLastUpdatedTime;
      }
      sidebars.push({
        threadInfo: childThreadInfo,
        lastUpdatedTime: sidebarLastUpdatedTime,
      });
    }
  }

  return {
    type: 'chatThreadItem',
    threadInfo,
    mostRecentMessageInfo,
    lastUpdatedTime,
    lastUpdatedTimeIncludingSidebars,
    sidebars,
  };
}

const chatListData: (
  state: BaseAppState<*>,
) => ChatThreadItem[] = createSelector(
  threadInfoSelector,
  (state: BaseAppState<*>) => state.messageStore,
  messageInfoSelector,
  childThreadInfos,
  (
    threadInfos: { [id: string]: ThreadInfo },
    messageStore: MessageStore,
    messageInfos: { [id: string]: MessageInfo },
    childThreads: { [id: string]: ThreadInfo[] },
  ): ChatThreadItem[] =>
    _flow(
      _filter(threadInChatList),
      _map((threadInfo: ThreadInfo): ChatThreadItem =>
        createChatThreadItem(
          threadInfo,
          messageStore,
          messageInfos,
          childThreads[threadInfo.id],
        ),
      ),
      _orderBy('lastUpdatedTime')('desc'),
    )(threadInfos),
);

// Requires UI that supports displaying sidebars inline
const chatListDataWithNestedSidebars: (
  state: BaseAppState<*>,
) => ChatThreadItem[] = createSelector(
  threadInfoSelector,
  (state: BaseAppState<*>) => state.messageStore,
  messageInfoSelector,
  childThreadInfos,
  (
    threadInfos: { [id: string]: ThreadInfo },
    messageStore: MessageStore,
    messageInfos: { [id: string]: MessageInfo },
    childThreads: { [id: string]: ThreadInfo[] },
  ): ChatThreadItem[] =>
    _flow(
      _filter(threadInChatList),
      _map((threadInfo: ThreadInfo): ChatThreadItem =>
        createChatThreadItem(
          threadInfo,
          messageStore,
          messageInfos,
          childThreads[threadInfo.id],
        ),
      ),
      _orderBy('lastUpdatedTimeIncludingSidebars')('desc'),
    )(threadInfos),
);

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
const chatMessageItemPropType = PropTypes.oneOfType([
  PropTypes.shape({
    itemType: PropTypes.oneOf(['loader']).isRequired,
  }),
  PropTypes.shape({
    itemType: PropTypes.oneOf(['message']).isRequired,
    messageInfo: messageInfoPropType.isRequired,
    localMessageInfo: localMessageInfoPropType,
    startsConversation: PropTypes.bool.isRequired,
    startsCluster: PropTypes.bool.isRequired,
    endsCluster: PropTypes.bool.isRequired,
    robotext: PropTypes.string,
  }),
]);
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
    let startsConversation = true;
    let startsCluster = true;
    if (
      lastMessageInfo &&
      lastMessageInfo.time + msInFiveMinutes > messageInfo.time
    ) {
      startsConversation = false;
      if (
        isComposableMessageType(lastMessageInfo.type) &&
        isComposableMessageType(messageInfo.type) &&
        lastMessageInfo.creator.id === messageInfo.creator.id
      ) {
        startsCluster = false;
      }
    }
    if (startsCluster && chatMessageItems.length > 0) {
      const lastMessageItem = chatMessageItems[chatMessageItems.length - 1];
      invariant(lastMessageItem.itemType === 'message', 'should be message');
      lastMessageItem.endsCluster = true;
    }
    if (isComposableMessageType(messageInfo.type)) {
      // We use these invariants instead of just checking the messageInfo.type
      // directly in the conditional above so that isComposableMessageType can
      // be the source of truth
      invariant(
        messageInfo.type === messageTypes.TEXT ||
          messageInfo.type === messageTypes.IMAGES ||
          messageInfo.type === messageTypes.MULTIMEDIA,
        "Flow doesn't understand isComposableMessageType above",
      );
      const localMessageInfo = messageStore.local[messageKey(messageInfo)];
      chatMessageItems.push({
        itemType: 'message',
        messageInfo,
        localMessageInfo,
        startsConversation,
        startsCluster,
        endsCluster: false,
      });
    } else {
      invariant(
        messageInfo.type !== messageTypes.TEXT &&
          messageInfo.type !== messageTypes.IMAGES &&
          messageInfo.type !== messageTypes.MULTIMEDIA,
        "Flow doesn't understand isComposableMessageType above",
      );
      const robotext = robotextForMessageInfo(
        messageInfo,
        threadInfos[threadID],
      );
      chatMessageItems.push({
        itemType: 'message',
        messageInfo,
        startsConversation,
        startsCluster,
        endsCluster: false,
        robotext,
      });
    }
    lastMessageInfo = messageInfo;
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
  chatThreadItemPropType,
  chatListData,
  chatListDataWithNestedSidebars,
  chatMessageItemPropType,
  createChatMessageItems,
  messageListData,
};
