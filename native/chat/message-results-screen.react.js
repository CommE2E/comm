// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { fetchPinnedMessages } from 'lib/actions/message-actions.js';
import { messageListData } from 'lib/selectors/chat-selectors.js';
import { createMessageInfo } from 'lib/shared/message-utils.js';
import { isComposableMessageType } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import { useHeightMeasurer } from './chat-context.js';
import type { ChatNavigationProp } from './chat.react';
import MessageResult from './message-result.react.js';
import type { NavigationRoute } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
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
  const styles = useStyles(unboundStyles);
  const { id: threadID } = threadInfo;
  const [rawMessageResults, setRawMessageResults] = React.useState([]);

  const measureMessages = useHeightMeasurer();
  const [measuredMessages, setMeasuredMessages] = React.useState([]);

  const [messageVerticalBounds, setMessageVerticalBounds] = React.useState();
  const scrollViewContainerRef = React.useRef();

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

    const pinnedMessageIDs = new Set();
    translatedMessageResults.forEach(item => pinnedMessageIDs.add(item.id));

    const chatMessageInfoItems = chatMessageInfos.filter(
      item =>
        item.itemType === 'message' &&
        pinnedMessageIDs.has(item.messageInfo.id) &&
        isComposableMessageType(item.messageInfo.type),
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
  }, [translatedMessageResults, chatMessageInfos, rawMessageResults]);

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

  const onLayout = React.useCallback(() => {
    scrollViewContainerRef.current?.measure(
      (x, y, width, height, pageX, pageY) => {
        if (
          height === null ||
          height === undefined ||
          pageY === null ||
          pageY === undefined
        ) {
          return;
        }

        setMessageVerticalBounds({ height, y: pageY });
      },
    );
  }, []);

  const messageResultsToDisplay = React.useMemo(
    () =>
      measuredMessages.map(item => {
        invariant(item.itemType !== 'loader', 'should not be loader');

        return (
          <MessageResult
            key={item.messageInfo.id}
            item={item}
            threadInfo={threadInfo}
            navigation={navigation}
            route={route}
            messageVerticalBounds={messageVerticalBounds}
            scrollable={false}
          />
        );
      }),
    [measuredMessages, threadInfo, navigation, route, messageVerticalBounds],
  );

  return (
    <View
      ref={scrollViewContainerRef}
      onLayout={onLayout}
      style={styles.scrollViewContainer}
    >
      <ScrollView>{messageResultsToDisplay}</ScrollView>
    </View>
  );
}

const unboundStyles = {
  scrollViewContainer: {
    flex: 1,
  },
};

export default MessageResultsScreen;
