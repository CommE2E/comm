// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { messageListData } from 'lib/selectors/chat-selectors.js';
import { createMessageInfo } from 'lib/shared/message-utils.js';
import { useSearchMessages } from 'lib/shared/search-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import SearchFooter from './search-footer.react.js';
import { MessageSearchContext } from './search-provider.react.js';
import { useHeightMeasurer } from '../chat/chat-context.js';
import type { ChatNavigationProp } from '../chat/chat.react.js';
import { MessageListContextProvider } from '../chat/message-list-types.js';
import MessageResult from '../chat/message-result.react.js';
import ListLoadingIndicator from '../components/list-loading-indicator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageItemWithHeight } from '../types/chat-types.js';

export type MessageSearchParams = {
  +threadInfo: ThreadInfo,
};

export type MessageSearchProps = {
  +navigation: ChatNavigationProp<'MessageSearch'>,
  +route: NavigationRoute<'MessageSearch'>,
};

function MessageSearch(props: MessageSearchProps): React.Node {
  const searchContext = React.useContext(MessageSearchContext);
  invariant(searchContext, 'searchContext should be set');
  const { query, clearQuery } = searchContext;
  const { threadInfo } = props.route.params;

  React.useEffect(() => {
    return props.navigation.addListener('beforeRemove', clearQuery);
  }, [props.navigation, clearQuery]);

  const [lastID, setLastID] = React.useState();
  const [searchResults, setSearchResults] = React.useState([]);
  const [endReached, setEndReached] = React.useState(false);

  const appendSearchResults = React.useCallback(
    (newMessages: $ReadOnlyArray<RawMessageInfo>, end: boolean) => {
      setSearchResults(oldMessages => [...oldMessages, ...newMessages]);
      setEndReached(end);
    },
    [],
  );

  const searchMessages = useSearchMessages();

  React.useEffect(() => {
    setSearchResults([]);
    setLastID(undefined);
    setEndReached(false);
  }, [query, searchMessages]);

  React.useEffect(
    () => searchMessages(query, threadInfo.id, appendSearchResults, lastID),
    [appendSearchResults, lastID, query, searchMessages, threadInfo.id],
  );

  const userInfos = useSelector(state => state.userStore.userInfos);

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

    const idSet = new Set(translatedSearchResults.map(item => item.id));

    const chatMessageInfoItems = chatMessageInfos.filter(
      item => item.messageInfo && idSet.has(item.messageInfo.id),
    );

    const uniqueChatMessageInfoItemsMap = new Map();
    chatMessageInfoItems.forEach(
      item =>
        item.messageInfo &&
        item.messageInfo.id &&
        uniqueChatMessageInfoItemsMap.set(item.messageInfo.id, item),
    );

    const sortedChatMessageInfoItems = [];
    for (let i = 0; i < translatedSearchResults.length; i++) {
      sortedChatMessageInfoItems.push(
        uniqueChatMessageInfoItemsMap.get(translatedSearchResults[i].id),
      );
    }
    if (!endReached) {
      sortedChatMessageInfoItems.push({ itemType: 'loader' });
    }

    return sortedChatMessageInfoItems.filter(Boolean);
  }, [chatMessageInfos, endReached, translatedSearchResults]);

  const [measuredMessages, setMeasuredMessages] = React.useState([]);

  const measureMessages = useHeightMeasurer();
  const measureCallback = React.useCallback(
    (listDataWithHeights: $ReadOnlyArray<ChatMessageItemWithHeight>) => {
      setMeasuredMessages(listDataWithHeights);
    },
    [setMeasuredMessages],
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
    if (query === '') {
      return <SearchFooter text="Your search results will appear here" />;
    }
    if (!endReached) {
      return null;
    }
    if (measuredMessages.length > 0) {
      return <SearchFooter text="End of results" />;
    }
    const text =
      'No results. Please try using different keywords to refine your search';
    return <SearchFooter text={text} />;
  }, [query, endReached, measuredMessages.length]);

  const onEndOfLoadedMessagesReached = React.useCallback(() => {
    if (endReached) {
      return;
    }
    setLastID(oldestMessageID(measuredMessages));
  }, [endReached, measuredMessages, setLastID]);

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

export default MessageSearch;
