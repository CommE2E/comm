// @flow

import IonIcon from '@expo/vector-icons/Ionicons.js';
import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  FlatList,
  Platform,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import { FloatingAction } from 'react-native-floating-action';

import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import {
  type ChatThreadItem,
  useFlattenedChatListData,
} from 'lib/selectors/chat-selectors.js';
import {
  createPendingThread,
  getThreadListSearchResults,
  useThreadListSearch,
} from 'lib/shared/thread-utils.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import type { UserInfo } from 'lib/types/user-types.js';

import { ChatThreadListItem } from './chat-thread-list-item.react.js';
import ChatThreadListSearch from './chat-thread-list-search.react.js';
import { getItemLayout, keyExtractor } from './chat-thread-list-utils.js';
import type {
  ChatTopTabsNavigationProp,
  ChatNavigationProp,
} from './chat.react.js';
import { useNavigateToThread } from './message-list-types.js';
import {
  SidebarListModalRouteName,
  HomeChatThreadListRouteName,
  BackgroundChatThreadListRouteName,
  type NavigationRoute,
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
  | { +type: 'empty', +emptyItem: React.ComponentType<{}> };

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

function ChatThreadList(props: BaseProps): React.Node {
  const boundChatListData = useFlattenedChatListData();
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
  const [numItemsToDisplay, setNumItemsToDisplay] = React.useState<number>(25);

  const onChangeSearchText = React.useCallback((updatedSearchText: string) => {
    setSearchText(updatedSearchText);
    setNumItemsToDisplay(25);
  }, []);

  const scrollPos = React.useRef(0);
  const flatListRef = React.useRef();

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

  const searchInputRef = React.useRef();

  const onPressItem = React.useCallback(
    (threadInfo: ThreadInfo, pendingPersonalThreadUserInfo?: UserInfo) => {
      onChangeSearchText('');
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
      navigateToThread({ threadInfo, pendingPersonalThreadUserInfo });
    },
    [navigateToThread, onChangeSearchText],
  );

  const onPressSeeMoreSidebars = React.useCallback(
    (threadInfo: ThreadInfo) => {
      onChangeSearchText('');
      if (searchInputRef.current) {
        this.searchInputRef.current.blur();
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
    ],
  );

  const renderItem = React.useCallback(
    (row: { item: Item, ... }) => {
      const item = row.item;
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
    setNumItemsToDisplay(prevNumItems => prevNumItems + 25);
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
  ]);

  const scrollEnabled =
    searchStatus === 'inactive' || searchStatus === 'active';
  // viewerID is in extraData since it's used by MessagePreview
  // within ChatThreadListItem
  const viewerID = loggedInUserInfo?.id;
  const extraData = `${viewerID || ''} ${openedSwipeableID}`;

  const chatThreadList = React.useMemo(
    () => (
      <View style={styles.container}>
        {fixedSearch}
        <FlatList
          data={partialListData}
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
      partialListData,
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
    const clearNavigationBlurListener = navigation.addListener('blur', () => {
      setNumItemsToDisplay(25);
    });

    return () => {
      // `.addListener` returns function that can be called to unsubscribe.
      // https://reactnavigation.org/docs/navigation-events/#navigationaddlistener
      clearNavigationBlurListener();
    };
  }, [navigation]);

  React.useEffect(() => {
    const chatNavigation: ?ChatNavigationProp<'ChatThreadList'> =
      navigation.getParent();
    invariant(chatNavigation, 'ChatNavigator should be within TabNavigator');
    const tabNavigation: ?TabNavigationProp<'Chat'> =
      chatNavigation.getParent();
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
};

export default ChatThreadList;
