// @flow

import type { BaseAppState } from 'lib/types/redux-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type {
  MessageInfo,
  MessageStore,
  RawMessageInfo,
  TextMessageInfo,
  RobotextMessageInfo,
} from 'lib/types/message-types';
import { messageInfoPropType } from 'lib/types/message-types';
import type { UserInfo } from 'lib/types/user-types';

import { createSelector } from 'reselect';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _flow from 'lodash/fp/flow';
import _filter from 'lodash/fp/filter';
import _map from 'lodash/fp/map';
import _orderBy from 'lodash/fp/orderBy';
import _memoize from 'lodash/memoize';

import { messageType } from 'lib/types/message-types';
import { robotextForMessageInfo } from 'lib/shared/message-utils';

function createMessageInfo(
  rawMessageInfo: RawMessageInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): MessageInfo {
  const creatorInfo = userInfos[rawMessageInfo.creatorID];
  if (rawMessageInfo.type === messageType.TEXT) {
    const messageInfo: TextMessageInfo = {
      type: messageType.TEXT,
      threadID: rawMessageInfo.threadID,
      creator: creatorInfo.username,
      isViewer: rawMessageInfo.creatorID === viewerID,
      time: rawMessageInfo.time,
      text: rawMessageInfo.text,
    };
    if (rawMessageInfo.id) {
      messageInfo.id = rawMessageInfo.id;
    }
    if (rawMessageInfo.localID) {
      messageInfo.localID = rawMessageInfo.localID;
    }
    return messageInfo;
  } else if (rawMessageInfo.type === messageType.CREATE_THREAD) {
    return {
      type: messageType.CREATE_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: creatorInfo.username,
      isViewer: rawMessageInfo.creatorID === viewerID,
      time: rawMessageInfo.time,
    };
  } else if (rawMessageInfo.type === messageType.ADD_USER) {
    const addedUsernames = [];
    for (let userID of rawMessageInfo.addedUserIDs) {
      if (userID === viewerID) {
        addedUsernames.unshift("you");
      } else {
        addedUsernames.push(userInfos[userID].username);
      }
    }
    return {
      type: messageType.ADD_USER,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator: creatorInfo.username,
      isViewer: rawMessageInfo.creatorID === viewerID,
      time: rawMessageInfo.time,
      addedUsernames,
    };
  }
  invariant(false, `${rawMessageInfo.type} is not a messageType!`);
}

export type ChatThreadItem = {
  threadInfo: ThreadInfo,
  mostRecentMessageInfo?: MessageInfo,
  lastUpdatedTime: number,
};
const chatThreadItemPropType = PropTypes.shape({
  threadInfo: threadInfoPropType.isRequired,
  mostRecentMessageInfo: messageInfoPropType,
  lastUpdatedTime: PropTypes.number.isRequired,
});
const chatListData = createSelector(
  (state: BaseAppState) => state.threadInfos,
  (state: BaseAppState) => state.messageStore,
  (state: BaseAppState) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState) => state.userInfos,
  (
    threadInfos: {[id: string]: ThreadInfo},
    messageStore: MessageStore,
    viewerID: ?string,
    userInfos: {[id: string]: UserInfo},
  ): ChatThreadItem[] => _flow(
    _filter('viewerIsMember'),
    _map((threadInfo: ThreadInfo): ChatThreadItem => {
      const thread = messageStore.threads[threadInfo.id];
      if (!thread || thread.messageIDs.length === 0) {
        return { threadInfo, lastUpdatedTime: threadInfo.creationTime };
      }
      const mostRecentRawMessageInfo =
        messageStore.messages[thread.messageIDs[0]];
      const mostRecentMessageInfo = createMessageInfo(
        mostRecentRawMessageInfo,
        viewerID,
        userInfos,
      );
      return {
        threadInfo,
        mostRecentMessageInfo,
        lastUpdatedTime: mostRecentMessageInfo.time,
      };
    }),
    _orderBy("lastUpdatedTime")("desc"),
  )(threadInfos),
);

export type ChatMessageInfoItem = {|
  itemType: "message",
  messageInfo: RobotextMessageInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
  robotext: string,
|} | {|
  itemType: "message",
  messageInfo: TextMessageInfo,
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
    startsConversation: PropTypes.bool.isRequired,
    startsCluster: PropTypes.bool.isRequired,
    endsCluster: PropTypes.bool.isRequired,
    robotext: PropTypes.string,
  }),
]);
const msInFiveMinutes = 5 * 60 * 1000;
const baseMessageListData = (threadID: string) => createSelector(
  (state: BaseAppState) => state.messageStore,
  (state: BaseAppState) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState) => state.userInfos,
  (
    messageStore: MessageStore,
    viewerID: ?string,
    userInfos: {[id: string]: UserInfo},
  ): ChatMessageItem[] => {
    const thread = messageStore.threads[threadID];
    if (!thread) {
      return [];
    }
    const rawMessageInfos = thread.messageIDs
      .map((messageID: string) => messageStore.messages[messageID])
      .filter(x => x);
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
          lastMessageInfo.type === messageType.TEXT &&
          rawMessageInfo.type === messageType.TEXT &&
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
      );
      if (messageInfo.type === messageType.TEXT) {
        chatMessageItems.push({
          itemType: "message",
          messageInfo,
          startsConversation,
          startsCluster,
          endsCluster: false,
        });
      } else if (
        messageInfo.type === messageType.CREATE_THREAD ||
          messageInfo.type === messageType.ADD_USER
      ) {
        const robotextParts = robotextForMessageInfo(messageInfo);
        chatMessageItems.push({
          itemType: "message",
          messageInfo,
          startsConversation,
          startsCluster,
          endsCluster: false,
          robotext: `${robotextParts[0]} ${robotextParts[1]}`,
        });
      } else {
        invariant(false, `${messageInfo.type} is not a messageType!`);
      }
      lastMessageInfo = messageInfo;
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
  },
);
const messageListData = _memoize(baseMessageListData);

export {
  chatThreadItemPropType,
  chatListData,
  chatMessageItemPropType,
  messageListData,
};
