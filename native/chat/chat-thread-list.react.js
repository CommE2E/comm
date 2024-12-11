// @flow

import IonIcon from '@expo/vector-icons/Ionicons.js';
import type {
  BottomTabNavigationEventMap,
  BottomTabOptions,
  StackNavigationEventMap,
  StackNavigationState,
  StackOptions,
  TabNavigationState,
} from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';
import {
  BackHandler,
  FlatList,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { FloatingAction } from 'react-native-floating-action';
import { useSharedValue } from 'react-native-reanimated';

import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import { useThreadListSearch } from 'lib/hooks/thread-search-hooks.js';
import {
  type ChatThreadItem,
  useFlattenedChatListLoaders,
} from 'lib/selectors/chat-selectors.js';
import {
  createPendingThread,
  getThreadListSearchResults,
} from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { UserInfo } from 'lib/types/user-types.js';
import ChatThreadItemLoaderCache from 'lib/utils/chat-thread-item-loader-cache.js';

import { ChatThreadListItem } from './chat-thread-list-item.react.js';
import ChatThreadListSearch from './chat-thread-list-search.react.js';
import { getItemLayout, keyExtractor } from './chat-thread-list-utils.js';
import type {
  ChatNavigationProp,
  ChatTopTabsNavigationProp,
} from './chat.react.js';
import { useNavigateToThread } from './message-list-types.js';
import ListLoadingIndicator from '../components/list-loading-indicator.react.js';
import {
  BackgroundChatThreadListRouteName,
  HomeChatThreadListRouteName,
  type NavigationRoute,
  type ScreenParamList,
  SidebarListModalRouteName,
} from '../navigation/route-names.js';
import type { TabNavigationProp } from '../navigation/tab-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { indicatorStyleSelector, useStyles } from '../themes/colors.js';
import type { ScrollEvent } from '../types/react-native.js';

const floatingActions = [
  {
    text: 'Compose',
    icon: <IonIcon name="md-create" size={24} color="#FFFFFF" />,
    name: 'compose',
    position: 1,
  },
];

export type Item =
  | ChatThreadItem
  | { +type: 'search', +searchText: string }
  | { +type: 'empty', +emptyItem: React.ComponentType<{}> }
  | { +type: 'loader' };

type BaseProps = {
  +navigation:
    | ChatTopTabsNavigationProp<'HomeChatThreadList'>
    | ChatTopTabsNavigationProp<'BackgroundChatThreadList'>,
  +route:
    | NavigationRoute<'HomeChatThreadList'>
    | NavigationRoute<'BackgroundChatThreadList'>,
  +filterThreads: (threadItem: ThreadInfo) => boolean,
  +emptyItem?: React.ComponentType<{}>,
};
export type SearchStatus = 'inactive' | 'activating' | 'active';

const pageSize = 25;

function ChatThreadList(props: BaseProps): React.Node {
  const chatThreadItemLoaders = useFlattenedChatListLoaders();
  const chatThreadItemLoaderCache = React.useMemo(
    () => new ChatThreadItemLoaderCache(chatThreadItemLoaders),
    [chatThreadItemLoaders],
  );

  const [boundChatListData, setBoundChatListData] = React.useState<
    $ReadOnlyArray<ChatThreadItem>,
  >(() => chatThreadItemLoaderCache.getAllChatThreadItems());

  const loggedInUserInfo = useLoggedInUserInfo();
  const styles = useStyles(unboundStyles);
  const indicatorStyle = useSelector(indicatorStyleSelector);

  const navigateToThread = useNavigateToThread();

  const { navigation, route, filterThreads, emptyItem } = props;

  const [searchText, setSearchText] = React.useState<string>('');
  const [searchStatus, setSearchStatus] =
    React.useState<SearchStatus>('inactive');

  const { threadSearchResults, usersSearchResults } = useThreadListSearch(
    searchText,
    loggedInUserInfo?.id,
  );

  const [openedSwipeableID, setOpenedSwipeableID] = React.useState<string>('');
  const [numItemsToDisplay, setNumItemsToDisplay] =
    React.useState<number>(pageSize);

  React.useEffect(() => {
    void (async () => {
      const results =
        await chatThreadItemLoaderCache.loadMostRecentChatThreadItems(
          numItemsToDisplay,
        );
      setBoundChatListData(results);
    })();
  }, [numItemsToDisplay, chatThreadItemLoaderCache]);

  const onChangeSearchText = React.useCallback((updatedSearchText: string) => {
    setSearchText(updatedSearchText);
    setNumItemsToDisplay(pageSize);
  }, []);

  const scrollPos = React.useRef(0);
  const flatListRef = React.useRef<?FlatList<Item>>();

  const onScroll = React.useCallback(
    (event: ScrollEvent) => {
      const oldScrollPos = scrollPos.current;
      scrollPos.current = event.nativeEvent.contentOffset.y;
      if (scrollPos.current !== 0 || oldScrollPos === 0) {
        return;
      }
      if (searchStatus === 'activating') {
        setSearchStatus('active');
      }
    },
    [searchStatus],
  );

  const onSwipeableWillOpen = React.useCallback(
    (threadInfo: ThreadInfo) => setOpenedSwipeableID(threadInfo.id),
    [],
  );

  const composeThread = React.useCallback(() => {
    if (!loggedInUserInfo) {
      return;
    }
    const threadInfo = createPendingThread({
      viewerID: loggedInUserInfo.id,
      threadType: threadTypes.PRIVATE,
      members: [loggedInUserInfo],
    });
    navigateToThread({ threadInfo, searching: true });
  }, [loggedInUserInfo, navigateToThread]);

  const onSearchFocus = React.useCallback(() => {
    if (searchStatus !== 'inactive') {
      return;
    }
    if (scrollPos.current === 0) {
      setSearchStatus('active');
    } else {
      setSearchStatus('activating');
    }
  }, [searchStatus]);

  const clearSearch = React.useCallback(() => {
    if (scrollPos.current > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
    setSearchStatus('inactive');
  }, []);

  const onSearchBlur = React.useCallback(() => {
    if (searchStatus !== 'active') {
      return;
    }
    clearSearch();
  }, [clearSearch, searchStatus]);

  const onSearchCancel = React.useCallback(() => {
    onChangeSearchText('');
    clearSearch();
  }, [clearSearch, onChangeSearchText]);

  const searchInputRef = React.useRef<?React.ElementRef<typeof TextInput>>();

  const onPressItem = React.useCallback(
    (threadInfo: ThreadInfo, pendingPersonalThreadUserInfo?: UserInfo) => {
      setSearchText('');
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
      navigateToThread({ threadInfo, pendingPersonalThreadUserInfo });
    },
    [navigateToThread],
  );

  const onPressSeeMoreSidebars = React.useCallback(
    (threadInfo: ThreadInfo) => {
      onChangeSearchText('');
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
      navigation.navigate<'SidebarListModal'>({
        name: SidebarListModalRouteName,
        params: { threadInfo },
      });
    },
    [navigation, onChangeSearchText],
  );

  const hardwareBack = React.useCallback(() => {
    if (!navigation.isFocused()) {
      return false;
    }
    const isActiveOrActivating =
      searchStatus === 'active' || searchStatus === 'activating';
    if (!isActiveOrActivating) {
      return false;
    }

    onSearchCancel();
    return true;
  }, [navigation, onSearchCancel, searchStatus]);

  const cancelButtonExpansion = useSharedValue(0);
  const searchItem = React.useMemo(
    () => (
      <TouchableWithoutFeedback onPress={onSearchFocus}>
        <View style={styles.searchContainer}>
          <ChatThreadListSearch
            searchText={searchText}
            onChangeText={onChangeSearchText}
            onBlur={onSearchBlur}
            searchStatus={searchStatus}
            onSearchCancel={onSearchCancel}
            innerSearchActive={false}
            cancelButtonExpansion={cancelButtonExpansion}
            ref={searchInputRef}
          />
        </View>
      </TouchableWithoutFeedback>
    ),
    [
      onChangeSearchText,
      onSearchBlur,
      onSearchCancel,
      onSearchFocus,
      searchStatus,
      searchText,
      styles.searchContainer,
      cancelButtonExpansion,
    ],
  );

  const renderItem = React.useCallback(
    (row: { item: Item, ... }) => {
      const item = row.item;
      if (item.type === 'loader') {
        return (
          <View style={styles.listLoadingIndicator}>
            <ListLoadingIndicator />
          </View>
        );
      }
      if (item.type === 'search') {
        return searchItem;
      }
      if (item.type === 'empty') {
        const EmptyItem = item.emptyItem;
        return <EmptyItem />;
      }
      return (
        <ChatThreadListItem
          data={item}
          onPressItem={onPressItem}
          onPressSeeMoreSidebars={onPressSeeMoreSidebars}
          onSwipeableWillOpen={onSwipeableWillOpen}
          currentlyOpenedSwipeableId={openedSwipeableID}
        />
      );
    },
    [
      onPressItem,
      onPressSeeMoreSidebars,
      onSwipeableWillOpen,
      openedSwipeableID,
      searchItem,
      styles.listLoadingIndicator,
    ],
  );

  const listData: $ReadOnlyArray<Item> = React.useMemo(() => {
    const chatThreadItems = getThreadListSearchResults(
      boundChatListData,
      searchText,
      filterThreads,
      threadSearchResults,
      usersSearchResults,
      loggedInUserInfo,
    );

    const chatItems: Item[] = [...chatThreadItems];

    if (emptyItem && chatItems.length === 0) {
      chatItems.push({ type: 'empty', emptyItem });
    }

    if (searchStatus === 'inactive' || searchStatus === 'activating') {
      chatItems.unshift({ type: 'search', searchText });
    }

    return chatItems;
  }, [
    boundChatListData,
    emptyItem,
    filterThreads,
    loggedInUserInfo,
    searchStatus,
    searchText,
    threadSearchResults,
    usersSearchResults,
  ]);

  const partialListData: $ReadOnlyArray<Item> = React.useMemo(
    () => listData.slice(0, numItemsToDisplay),
    [listData, numItemsToDisplay],
  );

  const onEndReached = React.useCallback(() => {
    if (partialListData.length === listData.length) {
      return;
    }
    setNumItemsToDisplay(prevNumItems => prevNumItems + pageSize);
  }, [listData.length, partialListData.length]);

  const floatingAction = React.useMemo(() => {
    if (Platform.OS !== 'android') {
      return null;
    }
    return (
      <FloatingAction
        actions={floatingActions}
        overrideWithAction
        onPressItem={composeThread}
        color="#7e57c2"
      />
    );
  }, [composeThread]);

  const fixedSearch = React.useMemo(() => {
    if (searchStatus !== 'active') {
      return null;
    }
    return (
      <View style={styles.searchContainer}>
        <ChatThreadListSearch
          searchText={searchText}
          onChangeText={onChangeSearchText}
          onBlur={onSearchBlur}
          searchStatus={searchStatus}
          onSearchCancel={onSearchCancel}
          innerSearchAutoFocus={true}
          cancelButtonExpansion={cancelButtonExpansion}
          ref={searchInputRef}
        />
      </View>
    );
  }, [
    onChangeSearchText,
    onSearchBlur,
    onSearchCancel,
    searchStatus,
    searchText,
    styles.searchContainer,
    cancelButtonExpansion,
  ]);

  const scrollEnabled =
    searchStatus === 'inactive' || searchStatus === 'active';
  // viewerID is in extraData since it's used by MessagePreview
  // within ChatThreadListItem
  const viewerID = loggedInUserInfo?.id;
  const extraData = `${viewerID || ''} ${openedSwipeableID}`;

  const finalListData = React.useMemo(() => {
    if (partialListData.length === listData.length) {
      return partialListData;
    }
    return [...partialListData, { type: 'loader' }];
  }, [partialListData, listData.length]);

  const chatThreadList = React.useMemo(
    () => (
      <View style={styles.container}>
        {fixedSearch}
        <FlatList
          data={finalListData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          extraData={extraData}
          initialNumToRender={11}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          style={styles.flatList}
          indicatorStyle={indicatorStyle}
          scrollEnabled={scrollEnabled}
          onEndReached={onEndReached}
          onEndReachedThreshold={1}
          ref={flatListRef}
        />
        {floatingAction}
      </View>
    ),
    [
      extraData,
      fixedSearch,
      floatingAction,
      indicatorStyle,
      onEndReached,
      onScroll,
      finalListData,
      renderItem,
      scrollEnabled,
      styles.container,
      styles.flatList,
    ],
  );

  const onTabPress = React.useCallback(() => {
    if (!navigation.isFocused()) {
      return;
    }
    if (scrollPos.current > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    } else if (route.name === BackgroundChatThreadListRouteName) {
      navigation.navigate({ name: HomeChatThreadListRouteName });
    }
  }, [navigation, route.name]);

  React.useEffect(() => {
    const chatNavigation = navigation.getParent<
      ScreenParamList,
      'ChatThreadList',
      StackNavigationState,
      StackOptions,
      StackNavigationEventMap,
      ChatNavigationProp<'ChatThreadList'>,
    >();
    invariant(chatNavigation, 'ChatNavigator should be within TabNavigator');

    const tabNavigation = chatNavigation.getParent<
      ScreenParamList,
      'Chat',
      TabNavigationState,
      BottomTabOptions,
      BottomTabNavigationEventMap,
      TabNavigationProp<'Chat'>,
    >();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');

    tabNavigation.addListener('tabPress', onTabPress);

    return () => {
      tabNavigation.removeListener('tabPress', onTabPress);
    };
  }, [navigation, onTabPress]);

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', hardwareBack);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', hardwareBack);
    };
  }, [hardwareBack]);

  React.useEffect(() => {
    if (scrollPos.current > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [searchText]);

  const isSearchActivating = searchStatus === 'activating';
  React.useEffect(() => {
    if (isSearchActivating && scrollPos.current > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [isSearchActivating]);

  return chatThreadList;
}

const unboundStyles = {
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    backgroundColor: 'listBackground',
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  flatList: {
    flex: 1,
    backgroundColor: 'listBackground',
  },
  listLoadingIndicator: {
    flex: 1,
  },
};

export default ChatThreadList;
