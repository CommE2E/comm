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
import Animated from 'react-native-reanimated';
import { createSelector } from 'reselect';

import { searchUsers as searchUsersEndpoint } from 'lib/actions/user-actions.js';
import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import {
  type ChatThreadItem,
  useFlattenedChatListData,
} from 'lib/selectors/chat-selectors.js';
import { useGlobalThreadSearchIndex } from 'lib/selectors/nav-selectors.js';
import { usersWithPersonalThreadSelector } from 'lib/selectors/user-selectors.js';
import SearchIndex from 'lib/shared/search-index.js';
import {
  createPendingThread,
  getThreadListSearchResults,
} from 'lib/shared/thread-utils.js';
import type { SetState } from 'lib/types/hook-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import type {
  GlobalAccountUserInfo,
  UserInfo,
  LoggedInUserInfo,
} from 'lib/types/user-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import { ChatThreadListItem } from './chat-thread-list-item.react.js';
import { getItemLayout, keyExtractor } from './chat-thread-list-utils.js';
import type {
  ChatTopTabsNavigationProp,
  ChatNavigationProp,
} from './chat.react.js';
import {
  type MessageListParams,
  useNavigateToThread,
} from './message-list-types.js';
import Button from '../components/button.react.js';
import Search from '../components/search.react.js';
import {
  SidebarListModalRouteName,
  HomeChatThreadListRouteName,
  BackgroundChatThreadListRouteName,
  type NavigationRoute,
} from '../navigation/route-names.js';
import type { TabNavigationProp } from '../navigation/tab-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import {
  type IndicatorStyle,
  indicatorStyleSelector,
  useStyles,
} from '../themes/colors.js';
import type { ScrollEvent } from '../types/react-native.js';
import { AnimatedView, type AnimatedStyleObj } from '../types/styles.js';
import { animateTowards } from '../utils/animation-utils.js';

const floatingActions = [
  {
    text: 'Compose',
    icon: <IonIcon name="md-create" size={24} color="#FFFFFF" />,
    name: 'compose',
    position: 1,
  },
];

/* eslint-disable import/no-named-as-default-member */
const { Value, Node, interpolateNode, useValue } = Animated;
/* eslint-enable import/no-named-as-default-member */

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
type SearchStatus = 'inactive' | 'activating' | 'active';
type Props = {
  ...BaseProps,
  // Redux state
  +chatListData: $ReadOnlyArray<ChatThreadItem>,
  +loggedInUserInfo: ?LoggedInUserInfo,
  +threadSearchIndex: SearchIndex,
  +styles: typeof unboundStyles,
  +indicatorStyle: IndicatorStyle,
  +usersWithPersonalThread: $ReadOnlySet<string>,
  +navigateToThread: (params: MessageListParams) => void,
  +searchText: string,
  +setSearchText: SetState<string>,
  +searchStatus: SearchStatus,
  +setSearchStatus: SetState<SearchStatus>,
  +threadsSearchResults: Set<string>,
  +setThreadsSearchResults: SetState<Set<string>>,
  +usersSearchResults: $ReadOnlyArray<GlobalAccountUserInfo>,
  +setUsersSearchResults: SetState<$ReadOnlyArray<GlobalAccountUserInfo>>,
  +openedSwipeableID: string,
  +setOpenedSwipeableID: SetState<string>,
  +numItemsToDisplay: number,
  +setNumItemsToDisplay: SetState<number>,
  +searchCancelButtonOpen: Value,
  +searchCancelButtonProgress: Node,
  +searchCancelButtonOffset: Node,
  +searchUsers: (
    usernamePrefix: string,
  ) => Promise<$ReadOnlyArray<GlobalAccountUserInfo>>,
  +onChangeSearchText: (searchText: string) => Promise<void>,
  +scrollPos: { current: number },
  +onScroll: (event: ScrollEvent) => void,
  +onSwipeableWillOpen: (threadInfo: ThreadInfo) => void,
  +composeThread: () => void,
  +onSearchCancel: () => void,
  +onSearchFocus: () => void,
  +renderSearch: (
    additionalProps?: $Shape<React.ElementConfig<typeof Search>>,
  ) => React.Node,
  +onPressItem: (
    threadInfo: ThreadInfo,
    pendingPersonalThreadUserInfo?: UserInfo,
  ) => void,
  +onPressSeeMoreSidebars: (threadInfo: ThreadInfo) => void,
  +hardwareBack: () => boolean,
  +renderItem: (row: { item: Item, ... }) => React.Node,
};

class ChatThreadList extends React.PureComponent<Props> {
  flatList: ?FlatList<Item>;
  clearNavigationBlurListener: ?() => mixed;

  constructor(props: Props) {
    super(props);
  }

  componentDidMount() {
    this.clearNavigationBlurListener = this.props.navigation.addListener(
      'blur',
      () => {
        this.props.setNumItemsToDisplay(25);
      },
    );

    const chatNavigation: ?ChatNavigationProp<'ChatThreadList'> =
      this.props.navigation.getParent();
    invariant(chatNavigation, 'ChatNavigator should be within TabNavigator');
    const tabNavigation: ?TabNavigationProp<'Chat'> =
      chatNavigation.getParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.addListener('tabPress', this.onTabPress);

    BackHandler.addEventListener('hardwareBackPress', this.props.hardwareBack);
  }

  componentWillUnmount() {
    this.clearNavigationBlurListener && this.clearNavigationBlurListener();

    const chatNavigation: ?ChatNavigationProp<'ChatThreadList'> =
      this.props.navigation.getParent();
    invariant(chatNavigation, 'ChatNavigator should be within TabNavigator');
    const tabNavigation: ?TabNavigationProp<'Chat'> =
      chatNavigation.getParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.removeListener('tabPress', this.onTabPress);

    BackHandler.removeEventListener(
      'hardwareBackPress',
      this.props.hardwareBack,
    );
  }

  componentDidUpdate(prevProps: Props) {
    const { searchStatus } = this.props;
    const prevSearchStatus = prevProps.searchStatus;

    const isActiveOrActivating =
      searchStatus === 'active' || searchStatus === 'activating';
    const wasActiveOrActivating =
      prevSearchStatus === 'active' || prevSearchStatus === 'activating';
    if (isActiveOrActivating && !wasActiveOrActivating) {
      this.props.searchCancelButtonOpen.setValue(1);
    } else if (!isActiveOrActivating && wasActiveOrActivating) {
      this.props.searchCancelButtonOpen.setValue(0);
    }

    const { flatList } = this;
    if (!flatList) {
      return;
    }

    if (this.props.searchText !== prevProps.searchText) {
      flatList.scrollToOffset({ offset: 0, animated: false });
      return;
    }

    if (searchStatus === 'activating' && prevSearchStatus === 'inactive') {
      flatList.scrollToOffset({ offset: 0, animated: true });
    }
  }

  onTabPress = () => {
    if (!this.props.navigation.isFocused()) {
      return;
    }
    if (this.props.scrollPos.current > 0 && this.flatList) {
      this.flatList.scrollToOffset({ offset: 0, animated: true });
    } else if (this.props.route.name === BackgroundChatThreadListRouteName) {
      this.props.navigation.navigate({ name: HomeChatThreadListRouteName });
    }
  };

  listDataSelector = createSelector(
    (props: Props) => props.chatListData,
    (props: Props) => props.searchStatus,
    (props: Props) => props.searchText,
    (props: Props) => props.threadsSearchResults,
    (props: Props) => props.emptyItem,
    (props: Props) => props.usersSearchResults,
    (props: Props) => props.filterThreads,
    (props: Props) => props.loggedInUserInfo,
    (
      reduxChatListData: $ReadOnlyArray<ChatThreadItem>,
      searchStatus: SearchStatus,
      searchText: string,
      threadsSearchResults: Set<string>,
      emptyItem?: React.ComponentType<{}>,
      usersSearchResults: $ReadOnlyArray<GlobalAccountUserInfo>,
      filterThreads: ThreadInfo => boolean,
      loggedInUserInfo: ?LoggedInUserInfo,
    ): $ReadOnlyArray<Item> => {
      const chatThreadItems = getThreadListSearchResults(
        reduxChatListData,
        searchText,
        filterThreads,
        threadsSearchResults,
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
    },
  );

  partialListDataSelector = createSelector(
    this.listDataSelector,
    (props: Props) => props.numItemsToDisplay,
    (items: $ReadOnlyArray<Item>, numItemsToDisplay: number) =>
      items.slice(0, numItemsToDisplay),
  );

  get fullListData() {
    return this.listDataSelector({ ...this.props, ...this.state });
  }

  get listData() {
    return this.partialListDataSelector({ ...this.props, ...this.state });
  }

  onEndReached = () => {
    if (this.listData.length === this.fullListData.length) {
      return;
    }
    this.props.setNumItemsToDisplay(prevNumItems => prevNumItems + 25);
  };

  render() {
    let floatingAction;
    if (Platform.OS === 'android') {
      floatingAction = (
        <FloatingAction
          actions={floatingActions}
          overrideWithAction
          onPressItem={this.props.composeThread}
          color="#7e57c2"
        />
      );
    }
    let fixedSearch;
    const { searchStatus } = this.props;
    if (searchStatus === 'active') {
      fixedSearch = this.props.renderSearch({ autoFocus: true });
    }
    const scrollEnabled =
      searchStatus === 'inactive' || searchStatus === 'active';
    // viewerID is in extraData since it's used by MessagePreview
    // within ChatThreadListItem
    const viewerID = this.props.loggedInUserInfo?.id;
    const extraData = `${viewerID || ''} ${this.props.openedSwipeableID}`;
    return (
      <View style={this.props.styles.container}>
        {fixedSearch}
        <FlatList
          data={this.listData}
          renderItem={this.props.renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          extraData={extraData}
          initialNumToRender={11}
          keyboardShouldPersistTaps="handled"
          onScroll={this.props.onScroll}
          style={this.props.styles.flatList}
          indicatorStyle={this.props.indicatorStyle}
          scrollEnabled={scrollEnabled}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={1}
          ref={this.flatListRef}
        />
        {floatingAction}
      </View>
    );
  }

  flatListRef = (flatList: ?FlatList<Item>) => {
    this.flatList = flatList;
  };
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
  searchBox: {
    flex: 1,
  },
  search: {
    marginBottom: 8,
    marginHorizontal: 18,
    marginTop: 16,
  },
  cancelSearchButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  cancelSearchButtonText: {
    color: 'link',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  flatList: {
    flex: 1,
    backgroundColor: 'listBackground',
  },
};

function ConnectedChatThreadList(props: BaseProps): React.Node {
  const boundChatListData = useFlattenedChatListData();
  const loggedInUserInfo = useLoggedInUserInfo();
  const threadSearchIndex = useGlobalThreadSearchIndex();
  const styles = useStyles(unboundStyles);
  const indicatorStyle = useSelector(indicatorStyleSelector);
  const callSearchUsers = useServerCall(searchUsersEndpoint);
  const usersWithPersonalThread = useSelector(usersWithPersonalThreadSelector);

  const navigateToThread = useNavigateToThread();

  const { navigation, route, filterThreads, emptyItem } = props;

  const [searchText, setSearchText] = React.useState<string>('');
  const [searchStatus, setSearchStatus] =
    React.useState<SearchStatus>('inactive');

  const [threadsSearchResults, setThreadsSearchResults] = React.useState<
    Set<string>,
  >(new Set());

  const [usersSearchResults, setUsersSearchResults] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
  >([]);

  const [openedSwipeableID, setOpenedSwipeableID] = React.useState<string>('');
  const [numItemsToDisplay, setNumItemsToDisplay] = React.useState<number>(25);

  const searchCancelButtonOpen: Value = useValue(0);
  const searchCancelButtonProgress: Node = React.useMemo(
    () => animateTowards(searchCancelButtonOpen, 100),
    [searchCancelButtonOpen],
  );
  const searchCancelButtonOffset: Node = React.useMemo(
    () =>
      interpolateNode(searchCancelButtonProgress, {
        inputRange: [0, 1],
        outputRange: [0, 56],
      }),
    [searchCancelButtonProgress],
  );

  const searchUsers = React.useCallback(
    async (usernamePrefix: string) => {
      if (usernamePrefix.length === 0) {
        return [];
      }

      const { userInfos } = await callSearchUsers(usernamePrefix);
      return userInfos.filter(
        info =>
          !usersWithPersonalThread.has(info.id) &&
          info.id !== loggedInUserInfo?.id,
      );
    },
    [callSearchUsers, loggedInUserInfo?.id, usersWithPersonalThread],
  );

  const onChangeSearchText = React.useCallback(
    async (updatedSearchText: string) => {
      const results = threadSearchIndex.getSearchResults(updatedSearchText);
      setSearchText(updatedSearchText);
      setThreadsSearchResults(new Set(results));
      setNumItemsToDisplay(25);
      const searchResults = await searchUsers(updatedSearchText);
      setUsersSearchResults(searchResults);
    },
    [searchUsers, threadSearchIndex],
  );

  const scrollPos = React.useRef(0);

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
    // TODO (atul): Scroll to top of flatList (animated: false)
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

  const animatedSearchBoxStyle: AnimatedStyleObj = React.useMemo(
    () => ({
      marginRight: searchCancelButtonOffset,
    }),
    [searchCancelButtonOffset],
  );

  const searchBoxStyle = React.useMemo(
    () => [styles.searchBox, animatedSearchBoxStyle],
    [animatedSearchBoxStyle, styles.searchBox],
  );

  const buttonStyle = React.useMemo(
    () => [
      styles.cancelSearchButtonText,
      { opacity: searchCancelButtonProgress },
    ],
    [searchCancelButtonProgress, styles.cancelSearchButtonText],
  );

  const searchInputRef = React.useRef();
  const renderSearch = React.useCallback(
    (additionalProps?: $Shape<React.ElementConfig<typeof Search>>) => (
      <View style={styles.searchContainer}>
        <Button
          onPress={onSearchCancel}
          disabled={searchStatus !== 'active'}
          style={styles.cancelSearchButton}
        >
          {/* eslint-disable react-native/no-raw-text */}
          <Animated.Text style={buttonStyle}>Cancel</Animated.Text>
          {/* eslint-enable react-native/no-raw-text */}
        </Button>
        <AnimatedView style={searchBoxStyle}>
          <Search
            searchText={searchText}
            onChangeText={onChangeSearchText}
            containerStyle={styles.search}
            onBlur={onSearchBlur}
            placeholder="Search chats"
            ref={searchInputRef}
            {...additionalProps}
          />
        </AnimatedView>
      </View>
    ),
    [
      buttonStyle,
      onChangeSearchText,
      onSearchBlur,
      onSearchCancel,
      searchBoxStyle,
      searchStatus,
      searchText,
      styles.cancelSearchButton,
      styles.search,
      styles.searchContainer,
    ],
  );

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

  const renderItem = React.useCallback(
    (row: { item: Item, ... }) => {
      const item = row.item;
      if (item.type === 'search') {
        return (
          <TouchableWithoutFeedback onPress={onSearchFocus}>
            {renderSearch({ active: false })}
          </TouchableWithoutFeedback>
        );
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
      onSearchFocus,
      onSwipeableWillOpen,
      openedSwipeableID,
      renderSearch,
    ],
  );

  return (
    <ChatThreadList
      navigation={navigation}
      route={route}
      filterThreads={filterThreads}
      emptyItem={emptyItem}
      chatListData={boundChatListData}
      loggedInUserInfo={loggedInUserInfo}
      threadSearchIndex={threadSearchIndex}
      styles={styles}
      indicatorStyle={indicatorStyle}
      usersWithPersonalThread={usersWithPersonalThread}
      navigateToThread={navigateToThread}
      searchText={searchText}
      setSearchText={setSearchText}
      searchStatus={searchStatus}
      setSearchStatus={setSearchStatus}
      threadsSearchResults={threadsSearchResults}
      setThreadsSearchResults={setThreadsSearchResults}
      usersSearchResults={usersSearchResults}
      setUsersSearchResults={setUsersSearchResults}
      openedSwipeableID={openedSwipeableID}
      setOpenedSwipeableID={setOpenedSwipeableID}
      numItemsToDisplay={numItemsToDisplay}
      setNumItemsToDisplay={setNumItemsToDisplay}
      searchCancelButtonOpen={searchCancelButtonOpen}
      searchCancelButtonProgress={searchCancelButtonProgress}
      searchCancelButtonOffset={searchCancelButtonOffset}
      searchUsers={searchUsers}
      onChangeSearchText={onChangeSearchText}
      scrollPos={scrollPos}
      onScroll={onScroll}
      onSwipeableWillOpen={onSwipeableWillOpen}
      composeThread={composeThread}
      onSearchCancel={onSearchCancel}
      onSearchFocus={onSearchFocus}
      renderSearch={renderSearch}
      onPressItem={onPressItem}
      onPressSeeMoreSidebars={onPressSeeMoreSidebars}
      hardwareBack={hardwareBack}
      renderItem={renderItem}
    />
  );
}

export default ConnectedChatThreadList;
