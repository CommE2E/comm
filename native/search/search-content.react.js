// @flow

import * as React from 'react';
import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { messageListData } from 'lib/selectors/chat-selectors.js';
import { createMessageInfo } from 'lib/shared/message-utils.js';
import { useSearchMessages } from 'lib/shared/search-utils.js';

import Statement from './statement.react.js';
import { useHeightMeasurer } from '../chat/chat-context.js';
import type { ChatNavigationProp } from '../chat/chat.react.js';
import { MessageListContextProvider } from '../chat/message-list-types.js';
import MessageResult from '../chat/message-result.react.js';
import ListLoadingIndicator from '../components/list-loading-indicator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageItemWithHeight } from '../types/chat-types.js';

type MessageSearchContentProps = {
  +navigation: ChatNavigationProp<'MessageSearch'>,
  +route: NavigationRoute<'MessageSearch'>,
  +query: string,
  +measuredMessages: $ReadOnlyArray<ChatMessageItemWithHeight>,
  +appendMeasuredMessages: (
    newMessages: $ReadOnlyArray<ChatMessageItemWithHeight>,
  ) => void,
  +lastSearchResultsID?: string,
  +setLastSearchResultsID: (id?: string) => void,
};

function MessageSearchContent(props: MessageSearchContentProps): React.Node {
  const { threadInfo } = props.route.params;
  const {
    query,
    measuredMessages,
    appendMeasuredMessages,
    lastSearchResultsID,
    setLastSearchResultsID,
  } = props;

  const { messages: searchResults, endReached } = useSearchMessages(
    query,
    threadInfo.id,
    lastSearchResultsID,
  );

  const userInfos = useSelector(state => state.userStore.userInfos);

  const onEndOfLoadedMessagesReached = React.useCallback(() => {
    if (endReached) {
      return;
    }
    setLastSearchResultsID(oldestMessageID(measuredMessages));
  }, [endReached, measuredMessages, setLastSearchResultsID]);

  const translatedSearchResults = React.useMemo(() => {
    const threadInfos = { [threadInfo.id]: threadInfo };

    return searchResults
      .map(rawMessageInfo =>
        createMessageInfo(rawMessageInfo, null, userInfos, threadInfos),
      )
      .filter(Boolean);
  }, [searchResults, threadInfo, userInfos]);

  const chatMessageInfos = useSelector(
    messageListData(threadInfo.id, translatedSearchResults),
  );

  const filteredChatMessageInfos = React.useMemo(() => {
    if (!chatMessageInfos) {
      return null;
    }

    const IDSet = new Set(searchResults.map(item => item.id));

    const chatMessageInfoItems = chatMessageInfos.filter(
      item => item.messageInfo && IDSet.has(item.messageInfo.id),
    );

    const uniqueChatMessageInfoItemsMap = new Map();
    chatMessageInfoItems.forEach(
      item =>
        item.messageInfo &&
        item.messageInfo.id &&
        uniqueChatMessageInfoItemsMap.set(item.messageInfo.id, item),
    );

    const sortedChatMessageInfoItems = [];
    for (let i = 0; i < searchResults.length; i++) {
      sortedChatMessageInfoItems.push(
        uniqueChatMessageInfoItemsMap.get(searchResults[i].id),
      );
    }
    const loader = chatMessageInfos.find(item => item.itemType === 'loader');
    if (loader && !endReached) {
      sortedChatMessageInfoItems.push(loader);
    }

    return sortedChatMessageInfoItems.filter(Boolean);
  }, [chatMessageInfos, endReached, searchResults]);

  const measureMessages = useHeightMeasurer();
  const measureCallback = React.useCallback(
    (listDataWithHeights: $ReadOnlyArray<ChatMessageItemWithHeight>) => {
      appendMeasuredMessages(listDataWithHeights);
    },
    [appendMeasuredMessages],
  );

  React.useEffect(() => {
    measureMessages(filteredChatMessageInfos, threadInfo, measureCallback);
  }, [filteredChatMessageInfos, measureCallback, measureMessages, threadInfo]);

  const [messageVerticalBounds, setMessageVerticalBounds] = React.useState();
  const scrollViewContainerRef = React.useRef();

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

  const renderItem = React.useCallback(
    ({ item }) => {
      if (item.itemType === 'loader') {
        return <ListLoadingIndicator />;
      }
      return (
        <MessageResult
          key={item.messageInfo.id}
          item={item}
          threadInfo={threadInfo}
          navigation={props.navigation}
          route={props.route}
          messageVerticalBounds={messageVerticalBounds}
        />
      );
    },
    [messageVerticalBounds, props.navigation, props.route, threadInfo],
  );

  const footer = React.useMemo(() => {
    if (!endReached) {
      return null;
    }
    if (measuredMessages.length > 0) {
      return <Statement text="End of results" />;
    }
    const text =
      'No results, please try using different\nkeywords to refine your search';
    return <Statement text={text} />;
  }, [measuredMessages.length, endReached]);

  const styles = useStyles(unboundStyles);

  return (
    <MessageListContextProvider threadInfo={threadInfo}>
      <View
        style={styles.content}
        ref={scrollViewContainerRef}
        onLayout={onLayout}
      >
        <FlatList
          renderItem={renderItem}
          data={measuredMessages}
          onEndReached={onEndOfLoadedMessagesReached}
          ListFooterComponent={footer}
        />
      </View>
    </MessageListContextProvider>
  );
}

function oldestMessageID(data: $ReadOnlyArray<ChatMessageItemWithHeight>) {
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].itemType === 'message' && data[i].messageInfo.id) {
      return data[i].messageInfo.id;
    }
  }
  return undefined;
}

const unboundStyles = {
  content: {
    height: '100%',
    backgroundColor: 'panelBackground',
  },
};

export default MessageSearchContent;
