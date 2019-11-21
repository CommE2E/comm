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
import type { UserInfo } from '../types/user-types';

import { createSelector } from 'reselect';
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
import { threadInChatList } from '../shared/thread-utils';

export type ChatThreadItem = {|
  type: "chatThreadItem",
  threadInfo: ThreadInfo,
  mostRecentMessageInfo?: MessageInfo,
  lastUpdatedTime: number,
|};
const chatThreadItemPropType = PropTypes.shape({
  type: PropTypes.oneOf(["chatThreadItem"]),
  threadInfo: threadInfoPropType.isRequired,
  mostRecentMessageInfo: messageInfoPropType,
  lastUpdatedTime: PropTypes.number.isRequired,
});

function createChatThreadItem(
  threadInfo: ThreadInfo,
  threadInfos: {[id: string]: ThreadInfo},
  messageStore: MessageStore,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): ChatThreadItem {
  const thread = messageStore.threads[threadInfo.id];
  if (!thread || thread.messageIDs.length === 0) {
    return {
      type: "chatThreadItem",
      threadInfo,
      lastUpdatedTime: threadInfo.creationTime,
    };
  }
  let mostRecentMessageInfo = undefined;
  for (let messageID of thread.messageIDs) {
    const mostRecentRawMessageInfo = messageStore.messages[messageID];
    mostRecentMessageInfo = createMessageInfo(
      mostRecentRawMessageInfo,
      viewerID,
      userInfos,
      threadInfos,
    );
    if (mostRecentMessageInfo) {
      break;
    }
  }
  if (!mostRecentMessageInfo) {
    return {
      type: "chatThreadItem",
      threadInfo,
      lastUpdatedTime: threadInfo.creationTime,
    };
  }
  return {
    type: "chatThreadItem",
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
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userInfos,
  (
    threadInfos: {[id: string]: ThreadInfo},
    messageStore: MessageStore,
    viewerID: ?string,
    userInfos: {[id: string]: UserInfo},
  ): ChatThreadItem[] => _flow(
    _filter(threadInChatList),
    _map((threadInfo: ThreadInfo): ChatThreadItem => createChatThreadItem(
      threadInfo,
      threadInfos,
      messageStore,
      viewerID,
      userInfos,
    )),
    _orderBy("lastUpdatedTime")("desc"),
  )(threadInfos),
);

export type RobotextChatMessageInfoItem = {|
  itemType: "message",
  messageInfo: RobotextMessageInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
  robotext: string,
|};
export type ChatMessageInfoItem =
  | RobotextChatMessageInfoItem
  | {|
      itemType: "message",
      messageInfo: ComposableMessageInfo,
      localMessageInfo: ?LocalMessageInfo,
      startsConversation: bool,
      startsCluster: bool,
      endsCluster: bool,
    |};
export type ChatMessageItem =
  {| itemType: "loader" |} |
  ChatMessageInfoItem;
const chatMessageItemPropType = PropTypes.oneOfType([
  PropTypes.shape({
    itemType: PropTypes.oneOf(["loader"]).isRequired,
  }),
  PropTypes.shape({
    itemType: PropTypes.oneOf(["message"]).isRequired,
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
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
  threadInfos: {[id: string]: ThreadInfo},
): ChatMessageItem[] {
  const thread = messageStore.threads[threadID];
  if (!thread) {
    return [];
  }
  const rawMessageInfos = thread.messageIDs
    .map((messageID: string) => messageStore.messages[messageID])
    .filter(Boolean);
  const chatMessageItems = [];
  let lastMessageInfo = null;
  for (let i = rawMessageInfos.length - 1; i >= 0; i--) {
    const rawMessageInfo = rawMessageInfos[i];
    let startsConversation = true;
    let startsCluster = true;
    if (
      lastMessageInfo &&
      lastMessageInfo.time + msInFiveMinutes > rawMessageInfo.time
    ) {
      startsConversation = false;
      if (
        isComposableMessageType(lastMessageInfo.type) &&
        isComposableMessageType(rawMessageInfo.type) &&
        lastMessageInfo.creatorID === rawMessageInfo.creatorID
      ) {
        startsCluster = false;
      }
    }
    if (startsCluster && chatMessageItems.length > 0) {
      const lastMessageItem = chatMessageItems[chatMessageItems.length - 1];
      invariant(lastMessageItem.itemType === "message", "should be message");
      lastMessageItem.endsCluster = true;
    }
    const messageInfo = createMessageInfo(
      rawMessageInfo,
      viewerID,
      userInfos,
      threadInfos,
    );
    if (!messageInfo) {
      continue;
    }
    if (isComposableMessageType(messageInfo.type)) {
      // We use these invariants instead of just checking the messageInfo.type
      // directly in the conditional above so that isComposableMessageType can
      // be the source of truth
      invariant(
        messageInfo.type === messageTypes.TEXT ||
          messageInfo.type === messageTypes.MULTIMEDIA,
        "Flow doesn't understand isComposableMessageType above",
      );
      const localMessageInfo = messageStore.local[messageKey(messageInfo)];
      chatMessageItems.push({
        itemType: "message",
        messageInfo,
        localMessageInfo,
        startsConversation,
        startsCluster,
        endsCluster: false,
      });
    } else {
      invariant(
        messageInfo.type !== messageTypes.TEXT &&
          messageInfo.type !== messageTypes.MULTIMEDIA,
        "Flow doesn't understand isComposableMessageType above",
      );
      const robotext = robotextForMessageInfo(
        messageInfo,
        threadInfos[threadID],
      );
      chatMessageItems.push({
        itemType: "message",
        messageInfo,
        startsConversation,
        startsCluster,
        endsCluster: false,
        robotext,
      });
    }
    lastMessageInfo = rawMessageInfo;
  }
  if (chatMessageItems.length > 0) {
    const lastMessageItem = chatMessageItems[chatMessageItems.length - 1];
    invariant(lastMessageItem.itemType === "message", "should be message");
    lastMessageItem.endsCluster = true;
  }
  chatMessageItems.reverse();
  if (thread.startReached) {
    return chatMessageItems;
  }
  return [...chatMessageItems, ({ itemType: "loader" }: ChatMessageItem)];
}

const baseMessageListData = (threadID: string) => createSelector(
  (state: BaseAppState<*>) => state.messageStore,
  (state: BaseAppState<*>) => state.currentUserInfo &&
    state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userInfos,
  threadInfoSelector,
  (
    messageStore: MessageStore,
    viewerID: ?string,
    userInfos: {[id: string]: UserInfo},
    threadInfos: {[id: string]: ThreadInfo},
  ): ChatMessageItem[] => createChatMessageItems(
    threadID,
    messageStore,
    viewerID,
    userInfos,
    threadInfos,
  ),
);
const messageListData: (
  threadID: string,
) => (
  state: BaseAppState<*>,
) => ChatMessageItem[] = _memoize(baseMessageListData);

export {
  createChatThreadItem,
  chatThreadItemPropType,
  chatListData,
  chatMessageItemPropType,
  createChatMessageItems,
  messageListData,
};
