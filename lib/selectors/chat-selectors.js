// @flow

import type { BaseAppState } from '../types/redux-types';
import { type ThreadInfo, threadInfoPropType } from '../types/thread-types';
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
import { threadInfoSelector } from './thread-selectors';
import {
  threadInChatList,
  threadInBackgroundChatList,
} from '../shared/thread-utils';

export type ChatThreadItem = {|
  type: 'chatThreadItem',
  threadInfo: ThreadInfo,
  mostRecentMessageInfo?: MessageInfo,
  lastUpdatedTime: number,
|};
const chatThreadItemPropType = PropTypes.shape({
  type: PropTypes.oneOf(['chatThreadItem']),
  threadInfo: threadInfoPropType.isRequired,
  mostRecentMessageInfo: messageInfoPropType,
  lastUpdatedTime: PropTypes.number.isRequired,
});

const messageInfoSelector: (
  state: BaseAppState<*>,
) => { [id: string]: MessageInfo } = createObjectSelector(
  (state: BaseAppState<*>) => state.messageStore.messages,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userInfos,
  threadInfoSelector,
  createMessageInfo,
);

function createChatThreadItem(
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
  messages: { [id: string]: MessageInfo },
): ChatThreadItem {
  const thread = messageStore.threads[threadInfo.id];
  if (!thread || thread.messageIDs.length === 0) {
    return {
      type: 'chatThreadItem',
      threadInfo,
      lastUpdatedTime: threadInfo.creationTime,
    };
  }
  let mostRecentMessageInfo = undefined;
  for (let messageID of thread.messageIDs) {
    mostRecentMessageInfo = messages[messageID];
    if (mostRecentMessageInfo) {
      break;
    }
  }
  if (!mostRecentMessageInfo) {
    return {
      type: 'chatThreadItem',
      threadInfo,
      lastUpdatedTime: threadInfo.creationTime,
    };
  }
  return {
    type: 'chatThreadItem',
    threadInfo,
    mostRecentMessageInfo,
    lastUpdatedTime: mostRecentMessageInfo.time,
  };
}

const chatListData: (
  state: BaseAppState<*>,
) => ChatThreadItem[] = createSelector(
  threadInfoSelector,
  (state: BaseAppState<*>) => state.messageStore,
  messageInfoSelector,
  (
    threadInfos: { [id: string]: ThreadInfo },
    messageStore: MessageStore,
    messageInfos: { [id: string]: MessageInfo },
  ): ChatThreadItem[] =>
    _flow(
      _filter(threadInChatList),
      _map((threadInfo: ThreadInfo): ChatThreadItem =>
        createChatThreadItem(threadInfo, messageStore, messageInfos),
      ),
      _orderBy('lastUpdatedTime')('desc'),
    )(threadInfos),
);

const chatBackgroundListData: (
  state: BaseAppState<*>,
) => ChatThreadItem[] = createSelector(
  threadInfoSelector,
  (state: BaseAppState<*>) => state.messageStore,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userInfos,
  (
    threadInfos: { [id: string]: ThreadInfo },
    messageStore: MessageStore,
    viewerID: ?string,
    userInfos: { [id: string]: UserInfo },
  ): ChatThreadItem[] =>
    _flow(
      _filter(threadInBackgroundChatList),
      _map((threadInfo: ThreadInfo): ChatThreadItem =>
        createChatThreadItem(
          threadInfo,
          threadInfos,
          messageStore,
          viewerID,
          userInfos,
        ),
      ),
      _orderBy('lastUpdatedTime')('desc'),
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
  chatBackgroundListData,
  chatMessageItemPropType,
  createChatMessageItems,
  messageListData,
};
