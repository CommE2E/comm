// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { useFetchPinnedMessages } from 'lib/actions/message-actions.js';
import {
  type ChatMessageInfoItem,
  messageListData,
} from 'lib/selectors/chat-selectors.js';
import { chatMessageItemKey } from 'lib/shared/chat-message-item-utils.js';
import {
  createMessageInfo,
  isInvalidPinSourceForThread,
} from 'lib/shared/message-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { useHeightMeasurer } from './chat-context.js';
import type { ChatNavigationProp } from './chat.react';
import type { NativeChatMessageItem } from './message-data.react.js';
import MessageResult from './message-result.react.js';
import type { NavigationRoute } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageItemWithHeight } from '../types/chat-types.js';
import type { VerticalBounds } from '../types/layout-types.js';

export type PinnedMessagesScreenParams = {
  +threadInfo: ThreadInfo,
};

type Props = {
  +navigation: ChatNavigationProp<'PinnedMessagesScreen'>,
  +route: NavigationRoute<'PinnedMessagesScreen'>,
};

function PinnedMessagesScreen(props: Props): React.Node {
  const { navigation, route } = props;
  const { threadInfo } = route.params;
  const styles = useStyles(unboundStyles);
  const { id: threadID } = threadInfo;
  const [rawMessageResults, setRawMessageResults] = React.useState<
    $ReadOnlyArray<RawMessageInfo>,
  >([]);

  const measureMessages = useHeightMeasurer();
  const [measuredMessages, setMeasuredMessages] = React.useState<
    $ReadOnlyArray<ChatMessageItemWithHeight>,
  >([]);

  const [messageVerticalBounds, setMessageVerticalBounds] =
    React.useState<?VerticalBounds>();
  const scrollViewContainerRef = React.useRef<?React.ElementRef<typeof View>>();

  const callFetchPinnedMessages = useFetchPinnedMessages();
  const userInfos = useSelector(state => state.userStore.userInfos);

  React.useEffect(() => {
    void (async () => {
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

  const sortedUniqueChatMessageInfoItems: $ReadOnlyArray<NativeChatMessageItem> =
    React.useMemo(() => {
      if (!chatMessageInfos) {
        return [];
      }

      const chatMessageInfoItems = chatMessageInfos.filter(
        item =>
          item.itemType === 'message' &&
          item.isPinned &&
          !isInvalidPinSourceForThread(item.messageInfo, threadInfo),
      );

      // By the nature of using messageListData and passing in
      // the desired translatedMessageResults as additional
      // messages, we will have duplicate ChatMessageInfoItems.
      const uniqueChatMessageInfoItemsMap = new Map<
        string,
        ChatMessageInfoItem,
      >();
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
        const { id } = rawMessageResults[i];
        invariant(id, 'pinned message returned from server should have ID');
        sortedChatMessageInfoItems.push(uniqueChatMessageInfoItemsMap.get(id));
      }

      return sortedChatMessageInfoItems.filter(Boolean);
    }, [chatMessageInfos, rawMessageResults, threadInfo]);

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
            key={chatMessageItemKey(item)}
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

export default PinnedMessagesScreen;
