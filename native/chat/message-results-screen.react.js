// @flow

import invariant from 'invariant';
import * as React from 'react';
import { ScrollView } from 'react-native';

import { fetchPinnedMessages } from 'lib/actions/message-actions.js';
import { messageListData } from 'lib/selectors/chat-selectors.js';
import { createMessageInfo } from 'lib/shared/message-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import { useHeightMeasurer } from './chat-context.js';
import type { ChatNavigationProp } from './chat.react';
import MessageResult from './message-result.react.js';
import type { NavigationRoute } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils.js';
import type { ChatMessageItemWithHeight } from '../types/chat-types.js';

export type MessageResultsScreenParams = {
  +threadInfo: ThreadInfo,
};

type MessageResultsScreenProps = {
  +navigation: ChatNavigationProp<'MessageResultsScreen'>,
  +route: NavigationRoute<'MessageResultsScreen'>,
};

function MessageResultsScreen(props: MessageResultsScreenProps): React.Node {
  const { navigation, route } = props;
  const { threadInfo } = route.params;
  const { id: threadID } = threadInfo;
  const [rawMessageResults, setRawMessageResults] = React.useState([]);

  const measureMessages = useHeightMeasurer();
  const [measuredMessages, setMeasuredMessages] = React.useState([]);

  const callFetchPinnedMessages = useServerCall(fetchPinnedMessages);
  const userInfos = useSelector(state => state.userStore.userInfos);

  React.useEffect(() => {
    (async () => {
      const result = await callFetchPinnedMessages({ threadID });
      setRawMessageResults(result.pinnedMessages);
    })();
  }, [callFetchPinnedMessages, threadID]);

  const translatedMessageResults = React.useMemo(() => {
    const threadInfos = { [threadID]: threadInfo };

    return rawMessageResults
      .map(messageInfo =>
        createMessageInfo(messageInfo, null, userInfos, threadInfos),
      )
      .filter(Boolean);
  }, [rawMessageResults, userInfos, threadID, threadInfo]);

  const chatMessageInfos = useSelector(
    messageListData(threadInfo.id, translatedMessageResults),
  );

  const sortedUniqueChatMessageInfoItems = React.useMemo(() => {
    if (!chatMessageInfos) {
      return [];
    }

    const chatMessageInfoItems = chatMessageInfos.filter(
      item => item.itemType === 'message' && item.isPinned,
    );

    // By the nature of using messageListData and passing in
    // the desired translatedMessageResults as additional
    // messages, we will have duplicate ChatMessageInfoItems.
    const uniqueChatMessageInfoItemsMap = new Map();
    chatMessageInfoItems.forEach(
      item =>
        item.messageInfo &&
        item.messageInfo.id &&
        uniqueChatMessageInfoItemsMap.set(item.messageInfo.id, item),
    );

    // Push the items in the order they appear in the rawMessageResults
    // since the messages fetched from the server are already sorted
    // in the order of pin_time (newest first).
    const sortedChatMessageInfoItems = [];
    for (let i = 0; i < rawMessageResults.length; i++) {
      sortedChatMessageInfoItems.push(
        uniqueChatMessageInfoItemsMap.get(rawMessageResults[i].id),
      );
    }

    return sortedChatMessageInfoItems.filter(Boolean);
  }, [chatMessageInfos, rawMessageResults]);

  const measureCallback = React.useCallback(
    (listDataWithHeights: $ReadOnlyArray<ChatMessageItemWithHeight>) => {
      setMeasuredMessages(listDataWithHeights);
    },
    [],
  );

  React.useEffect(() => {
    measureMessages(
      sortedUniqueChatMessageInfoItems,
      threadInfo,
      measureCallback,
    );
  }, [
    measureCallback,
    measureMessages,
    sortedUniqueChatMessageInfoItems,
    threadInfo,
  ]);

  const modifiedItems = React.useMemo(() => {
    return measuredMessages.map(item => {
      invariant(item.itemType !== 'loader', 'should not be loader');
      invariant(item.messageShapeType !== 'robotext', 'should not be robotext');

      if (item.messageShapeType === 'multimedia') {
        return {
          ...item,
          startsConversation: false,
          endsCluster: true,
          messageInfo: {
            ...item.messageInfo,
            creator: {
              ...item.messageInfo.creator,
              isViewer: false,
            },
          },
        };
      }

      return {
        ...item,
        startsConversation: false,
        endsCluster: true,
        messageInfo: {
          ...item.messageInfo,
          creator: {
            ...item.messageInfo.creator,
            isViewer: false,
          },
        },
      };
    });
  }, [measuredMessages]);

  const messageResultsToDisplay = React.useMemo(() => {
    return modifiedItems.map(item => {
      return (
        <MessageResult
          key={item.messageInfo.id}
          item={item}
          threadInfo={threadInfo}
          navigation={navigation}
          route={route}
        />
      );
    });
  }, [modifiedItems, threadInfo, navigation, route]);

  return <ScrollView>{messageResultsToDisplay}</ScrollView>;
}

export default MessageResultsScreen;
