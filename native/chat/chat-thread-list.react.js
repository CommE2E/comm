// @flow

import invariant from 'invariant';
import _sum from 'lodash/fp/sum';
import * as React from 'react';
import {
  View,
  FlatList,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import { FloatingAction } from 'react-native-floating-action';
import Animated from 'react-native-reanimated';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { createSelector } from 'reselect';

import { searchUsers } from 'lib/actions/user-actions';
import {
  type ChatThreadItem,
  useFlattenedChatListData,
} from 'lib/selectors/chat-selectors';
import { threadSearchIndex as threadSearchIndexSelector } from 'lib/selectors/nav-selectors';
import { usersWithPersonalThreadSelector } from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';
import {
  createPendingThread,
  createPendingThreadItem,
  threadIsTopLevel,
} from 'lib/shared/thread-utils';
import type { UserSearchResult } from 'lib/types/search-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadTypes } from 'lib/types/thread-types';
import type { GlobalAccountUserInfo, UserInfo } from 'lib/types/user-types';
import { useServerCall } from 'lib/utils/action-utils';

import Button from '../components/button.react';
import Search from '../components/search.react';
import type { TabNavigationProp } from '../navigation/app-navigator.react';
import {
  SidebarListModalRouteName,
  HomeChatThreadListRouteName,
  BackgroundChatThreadListRouteName,
  type NavigationRoute,
} from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import {
  type IndicatorStyle,
  indicatorStyleSelector,
  useStyles,
} from '../themes/colors';
import type { ScrollEvent } from '../types/react-native';
import { AnimatedView, type AnimatedStyleObj } from '../types/styles';
import { animateTowards } from '../utils/animation-utils';
import {
  ChatThreadListItem,
  chatThreadListItemHeight,
  spacerHeight,
} from './chat-thread-list-item.react';
import type {
  ChatTopTabsNavigationProp,
  ChatNavigationProp,
} from './chat.react';
import {
  type MessageListParams,
  useNavigateToThread,
} from './message-list-types';
import { sidebarHeight } from './sidebar-item.react';

const floatingActions = [
  {
    text: 'Compose',
    icon: <IonIcon name="md-create" size={24} color="#FFFFFF" />,
    name: 'compose',
    position: 1,
  },
];

/* eslint-disable import/no-named-as-default-member */
const { Value, Node, interpolateNode } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Item =
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
type Props = {
  ...BaseProps,
  // Redux state
  +chatListData: $ReadOnlyArray<ChatThreadItem>,
  +viewerID: ?string,
  +threadSearchIndex: SearchIndex,
  +styles: typeof unboundStyles,
  +indicatorStyle: IndicatorStyle,
  +usersWithPersonalThread: $ReadOnlySet<string>,
  +navigateToThread: (params: MessageListParams) => void,
  // async functions that hit server APIs
  +searchUsers: (usernamePrefix: string) => Promise<UserSearchResult>,
};
type SearchStatus = 'inactive' | 'activating' | 'active';
type State = {
  +searchStatus: SearchStatus,
  +searchText: string,
  +threadsSearchResults: Set<string>,
  +usersSearchResults: $ReadOnlyArray<GlobalAccountUserInfo>,
  +openedSwipeableId: string,
  +numItemsToDisplay: number,
};
type PropsAndState = { ...Props, ...State };
class ChatThreadList extends React.PureComponent<Props, State> {
  state: State = {
    searchStatus: 'inactive',
    searchText: '',
    threadsSearchResults: new Set(),
    usersSearchResults: [],
    openedSwipeableId: '',
    numItemsToDisplay: 25,
  };
  searchInput: ?React.ElementRef<typeof TextInput>;
  flatList: ?FlatList<Item>;
  scrollPos = 0;
  clearNavigationBlurListener: ?() => mixed;
  searchCancelButtonOpen: Value = new Value(0);
  searchCancelButtonProgress: Node;
  searchCancelButtonOffset: Node;

  constructor(props: Props) {
    super(props);
    this.searchCancelButtonProgress = animateTowards(
      this.searchCancelButtonOpen,
      100,
    );
    this.searchCancelButtonOffset = interpolateNode(
      this.searchCancelButtonProgress,
      { inputRange: [0, 1], outputRange: [0, 56] },
    );
  }

  componentDidMount() {
    this.clearNavigationBlurListener = this.props.navigation.addListener(
      'blur',
      () => {
        this.setState({ numItemsToDisplay: 25 });
      },
    );

    const chatNavigation: ?ChatNavigationProp<
      'ChatThreadList',
    > = this.props.navigation.dangerouslyGetParent();
    invariant(chatNavigation, 'ChatNavigator should be within TabNavigator');
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = chatNavigation.dangerouslyGetParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.addListener('tabPress', this.onTabPress);

    BackHandler.addEventListener('hardwareBackPress', this.hardwareBack);
  }

  componentWillUnmount() {
    this.clearNavigationBlurListener && this.clearNavigationBlurListener();

    const chatNavigation: ?ChatNavigationProp<
      'ChatThreadList',
    > = this.props.navigation.dangerouslyGetParent();
    invariant(chatNavigation, 'ChatNavigator should be within TabNavigator');
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = chatNavigation.dangerouslyGetParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.removeListener('tabPress', this.onTabPress);

    BackHandler.removeEventListener('hardwareBackPress', this.hardwareBack);
  }

  hardwareBack = () => {
    if (!this.props.navigation.isFocused()) {
      return false;
    }

    const { searchStatus } = this.state;
    const isActiveOrActivating =
      searchStatus === 'active' || searchStatus === 'activating';
    if (!isActiveOrActivating) {
      return false;
    }

    this.onSearchCancel();
    return true;
  };

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { searchStatus } = this.state;
    const prevSearchStatus = prevState.searchStatus;

    const isActiveOrActivating =
      searchStatus === 'active' || searchStatus === 'activating';
    const wasActiveOrActivating =
      prevSearchStatus === 'active' || prevSearchStatus === 'activating';
    if (isActiveOrActivating && !wasActiveOrActivating) {
      this.searchCancelButtonOpen.setValue(1);
    } else if (!isActiveOrActivating && wasActiveOrActivating) {
      this.searchCancelButtonOpen.setValue(0);
    }

    const { flatList } = this;
    if (!flatList) {
      return;
    }

    if (this.state.searchText !== prevState.searchText) {
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
    if (this.scrollPos > 0 && this.flatList) {
      this.flatList.scrollToOffset({ offset: 0, animated: true });
    } else if (this.props.route.name === BackgroundChatThreadListRouteName) {
      this.props.navigation.navigate({ name: HomeChatThreadListRouteName });
    }
  };

  onSearchFocus = () => {
    if (this.state.searchStatus !== 'inactive') {
      return;
    }
    if (this.scrollPos === 0) {
      this.setState({ searchStatus: 'active' });
    } else {
      this.setState({ searchStatus: 'activating' });
    }
  };

  clearSearch() {
    const { flatList } = this;
    flatList && flatList.scrollToOffset({ offset: 0, animated: false });
    this.setState({ searchStatus: 'inactive' });
  }

  onSearchBlur = () => {
    if (this.state.searchStatus !== 'active') {
      return;
    }
    this.clearSearch();
  };

  onSearchCancel = () => {
    this.onChangeSearchText('');
    this.clearSearch();
  };

  renderSearch(additionalProps?: $Shape<React.ElementConfig<typeof Search>>) {
    const animatedSearchBoxStyle: AnimatedStyleObj = {
      marginRight: this.searchCancelButtonOffset,
    };
    const searchBoxStyle = [
      this.props.styles.searchBox,
      animatedSearchBoxStyle,
    ];
    const buttonStyle = [
      this.props.styles.cancelSearchButtonText,
      { opacity: this.searchCancelButtonProgress },
    ];
    return (
      <View style={this.props.styles.searchContainer}>
        <Button
          onPress={this.onSearchCancel}
          disabled={this.state.searchStatus !== 'active'}
          style={this.props.styles.cancelSearchButton}
        >
          {/* eslint-disable react-native/no-raw-text */}
          <Animated.Text style={buttonStyle}>Cancel</Animated.Text>
          {/* eslint-enable react-native/no-raw-text */}
        </Button>
        <AnimatedView style={searchBoxStyle}>
          <Search
            searchText={this.state.searchText}
            onChangeText={this.onChangeSearchText}
            containerStyle={this.props.styles.search}
            onBlur={this.onSearchBlur}
            placeholder="Search threads"
            ref={this.searchInputRef}
            {...additionalProps}
          />
        </AnimatedView>
      </View>
    );
  }

  searchInputRef = (searchInput: ?React.ElementRef<typeof TextInput>) => {
    this.searchInput = searchInput;
  };

  renderItem = (row: { item: Item, ... }) => {
    const item = row.item;
    if (item.type === 'search') {
      return (
        <TouchableWithoutFeedback onPress={this.onSearchFocus}>
          {this.renderSearch({ active: false })}
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
        onPressItem={this.onPressItem}
        onPressSeeMoreSidebars={this.onPressSeeMoreSidebars}
        onSwipeableWillOpen={this.onSwipeableWillOpen}
        currentlyOpenedSwipeableId={this.state.openedSwipeableId}
      />
    );
  };

  static keyExtractor = (item: Item) => {
    if (item.type === 'chatThreadItem') {
      return item.threadInfo.id;
    } else if (item.type === 'empty') {
      return 'empty';
    } else {
      return 'search';
    }
  };

  static getItemLayout = (data: ?$ReadOnlyArray<Item>, index: number) => {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset = ChatThreadList.heightOfItems(
      data.filter((_, i) => i < index),
    );
    const item = data[index];
    const length = item ? ChatThreadList.itemHeight(item) : 0;
    return { length, offset, index };
  };

  static itemHeight = (item: Item) => {
    if (item.type === 'search') {
      return Platform.OS === 'ios' ? 54.5 : 55;
    }

    // itemHeight for emptyItem might be wrong because of line wrapping
    // but we don't care because we'll only ever be rendering this item by itself
    // and it should always be on-screen
    if (item.type === 'empty') {
      return 123;
    }

    let height = chatThreadListItemHeight;
    height += item.sidebars.length * sidebarHeight;
    if (item.sidebars.length > 0) {
      height += spacerHeight;
    }
    return height;
  };

  static heightOfItems(data: $ReadOnlyArray<Item>): number {
    return _sum(data.map(ChatThreadList.itemHeight));
  }

  listDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.chatListData,
    (propsAndState: PropsAndState) => propsAndState.searchStatus,
    (propsAndState: PropsAndState) => propsAndState.searchText,
    (propsAndState: PropsAndState) => propsAndState.threadsSearchResults,
    (propsAndState: PropsAndState) => propsAndState.emptyItem,
    (propsAndState: PropsAndState) => propsAndState.usersSearchResults,
    (
      reduxChatListData: $ReadOnlyArray<ChatThreadItem>,
      searchStatus: SearchStatus,
      searchText: string,
      threadsSearchResults: Set<string>,
      emptyItem?: React.ComponentType<{}>,
      usersSearchResults: $ReadOnlyArray<GlobalAccountUserInfo>,
    ): $ReadOnlyArray<Item> => {
      const chatItems = [];

      if (!searchText) {
        chatItems.push(
          ...reduxChatListData.filter(
            item =>
              threadIsTopLevel(item.threadInfo) &&
              this.props.filterThreads(item.threadInfo),
          ),
        );
      } else {
        const privateThreads = [];
        const personalThreads = [];
        const otherThreads = [];
        for (const item of reduxChatListData) {
          if (!threadsSearchResults.has(item.threadInfo.id)) {
            continue;
          }
          if (item.threadInfo.type === threadTypes.PRIVATE) {
            privateThreads.push({ ...item, sidebars: [] });
          } else if (item.threadInfo.type === threadTypes.PERSONAL) {
            personalThreads.push({ ...item, sidebars: [] });
          } else {
            otherThreads.push({ ...item, sidebars: [] });
          }
        }
        chatItems.push(...privateThreads, ...personalThreads, ...otherThreads);
        const { viewerID } = this.props;
        if (viewerID) {
          chatItems.push(
            ...usersSearchResults.map(user =>
              createPendingThreadItem(viewerID, user),
            ),
          );
        }
      }

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
    (propsAndState: PropsAndState) => propsAndState.numItemsToDisplay,
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
    this.setState(prevState => ({
      numItemsToDisplay: prevState.numItemsToDisplay + 25,
    }));
  };

  render() {
    let floatingAction;
    if (Platform.OS === 'android') {
      floatingAction = (
        <FloatingAction
          actions={floatingActions}
          overrideWithAction
          onPressItem={this.composeThread}
          color="#7e57c2"
        />
      );
    }
    let fixedSearch;
    const { searchStatus } = this.state;
    if (searchStatus === 'active') {
      fixedSearch = this.renderSearch({ autoFocus: true });
    }
    const scrollEnabled =
      searchStatus === 'inactive' || searchStatus === 'active';
    // this.props.viewerID is in extraData since it's used by MessagePreview
    // within ChatThreadListItem
    return (
      <View style={this.props.styles.container}>
        {fixedSearch}
        <FlatList
          data={this.listData}
          renderItem={this.renderItem}
          keyExtractor={ChatThreadList.keyExtractor}
          getItemLayout={ChatThreadList.getItemLayout}
          extraData={`${this.props.viewerID || ''} ${
            this.state.openedSwipeableId
          }`}
          initialNumToRender={11}
          keyboardShouldPersistTaps="handled"
          onScroll={this.onScroll}
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

  onScroll = (event: ScrollEvent) => {
    const oldScrollPos = this.scrollPos;
    this.scrollPos = event.nativeEvent.contentOffset.y;
    if (this.scrollPos !== 0 || oldScrollPos === 0) {
      return;
    }
    if (this.state.searchStatus === 'activating') {
      this.setState({ searchStatus: 'active' });
    }
  };

  async searchUsers(usernamePrefix: string) {
    if (usernamePrefix.length === 0) {
      return [];
    }

    const { userInfos } = await this.props.searchUsers(usernamePrefix);
    return userInfos.filter(
      info =>
        !this.props.usersWithPersonalThread.has(info.id) &&
        info.id !== this.props.viewerID,
    );
  }

  onChangeSearchText = async (searchText: string) => {
    const results = this.props.threadSearchIndex.getSearchResults(searchText);
    this.setState({
      searchText,
      threadsSearchResults: new Set(results),
      numItemsToDisplay: 25,
    });
    const usersSearchResults = await this.searchUsers(searchText);
    this.setState({ usersSearchResults });
  };

  onPressItem = (
    threadInfo: ThreadInfo,
    pendingPersonalThreadUserInfo?: UserInfo,
  ) => {
    this.onChangeSearchText('');
    if (this.searchInput) {
      this.searchInput.blur();
    }
    this.props.navigateToThread({ threadInfo, pendingPersonalThreadUserInfo });
  };

  onPressSeeMoreSidebars = (threadInfo: ThreadInfo) => {
    this.onChangeSearchText('');
    if (this.searchInput) {
      this.searchInput.blur();
    }
    this.props.navigation.navigate({
      name: SidebarListModalRouteName,
      params: { threadInfo },
    });
  };

  onSwipeableWillOpen = (threadInfo: ThreadInfo) => {
    this.setState(state => ({ ...state, openedSwipeableId: threadInfo.id }));
  };

  composeThread = () => {
    if (!this.props.viewerID) {
      return;
    }
    const threadInfo = createPendingThread({
      viewerID: this.props.viewerID,
      threadType: threadTypes.PRIVATE,
    });
    this.props.navigateToThread({ threadInfo, searching: true });
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

const ConnectedChatThreadList: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedChatThreadList(props: BaseProps) {
    const boundChatListData = useFlattenedChatListData();
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    const threadSearchIndex = useSelector(threadSearchIndexSelector);
    const styles = useStyles(unboundStyles);
    const indicatorStyle = useSelector(indicatorStyleSelector);
    const callSearchUsers = useServerCall(searchUsers);
    const usersWithPersonalThread = useSelector(
      usersWithPersonalThreadSelector,
    );

    const navigateToThread = useNavigateToThread();

    return (
      <ChatThreadList
        {...props}
        chatListData={boundChatListData}
        viewerID={viewerID}
        threadSearchIndex={threadSearchIndex}
        styles={styles}
        indicatorStyle={indicatorStyle}
        searchUsers={callSearchUsers}
        usersWithPersonalThread={usersWithPersonalThread}
        navigateToThread={navigateToThread}
      />
    );
  },
);

export default ConnectedChatThreadList;
