// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { messageListData } from 'lib/selectors/chat-selectors.js';
import { chatMessageItemKey } from 'lib/shared/chat-message-item-utils.js';
import { createMessageInfo } from 'lib/shared/message-utils.js';
import {
  filterChatMessageInfosForSearch,
  useSearchMessages,
} from 'lib/shared/search-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

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
import type { VerticalBounds } from '../types/layout-types.js';

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

  const [lastID, setLastID] = React.useState<?string>();
  const [lastTimestamp, setLastTimestamp] = React.useState<?number>();
  const [searchResults, setSearchResults] = React.useState<
    $ReadOnlyArray<RawMessageInfo>,
  >([]);
  const [endReached, setEndReached] = React.useState(false);

  const appendSearchResults = React.useCallback(
    (
      newMessages: $ReadOnlyArray<RawMessageInfo>,
      end: boolean,
      queryID: number,
    ) => {
      if (queryID !== queryIDRef.current) {
        return;
      }
      setSearchResults(oldMessages => [...oldMessages, ...newMessages]);
      setEndReached(end);
    },
    [],
  );

  const searchMessages = useSearchMessages();

  const queryIDRef = React.useRef(0);

  React.useEffect(() => {
    setSearchResults([]);
    setLastID(undefined);
    setLastTimestamp(undefined);
    setEndReached(false);
  }, [query, searchMessages]);

  React.useEffect(() => {
    queryIDRef.current += 1;
    searchMessages(
      query,
      threadInfo.id,
      appendSearchResults,
      queryIDRef.current,
      lastTimestamp,
      lastID,
    );
  }, [
    appendSearchResults,
    lastID,
    query,
    searchMessages,
    threadInfo.id,
    lastTimestamp,
  ]);

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
    const result = filterChatMessageInfosForSearch(
      chatMessageInfos,
      translatedSearchResults,
    );
    if (result && !endReached) {
      return [...result, { itemType: 'loader' }];
    }
    return result;
  }, [chatMessageInfos, endReached, translatedSearchResults]);

  const [measuredMessages, setMeasuredMessages] = React.useState<
    $ReadOnlyArray<ChatMessageItemWithHeight>,
  >([]);

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

  const [messageVerticalBounds, setMessageVerticalBounds] =
    React.useState<?VerticalBounds>();
  const scrollViewContainerRef = React.useRef<?React.ElementRef<typeof View>>();

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
    ({ item }: { +item: ChatMessageItemWithHeight, ... }) => {
      if (item.itemType === 'loader') {
        return <ListLoadingIndicator />;
      }
      return (
        <MessageResult
          key={chatMessageItemKey(item)}
          item={item}
          threadInfo={threadInfo}
          navigation={props.navigation}
          route={props.route}
          messageVerticalBounds={messageVerticalBounds}
          scrollable={false}
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
    const oldest = oldestMessage(measuredMessages);
    setLastID(oldest?.id);
    setLastTimestamp(oldest?.time);
  }, [endReached, measuredMessages]);

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

function oldestMessage(data: $ReadOnlyArray<ChatMessageItemWithHeight>) {
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].itemType === 'message' && data[i].messageInfo.id) {
      return data[i].messageInfo;
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
