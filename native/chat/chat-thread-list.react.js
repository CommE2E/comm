// @flow

import type { AppState } from '../redux/redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { TabNavigationProp } from '../navigation/app-navigator.react';
import type { ChatNavigationProp } from './chat.react';

import * as React from 'react';
import { View, FlatList, Platform, TextInput } from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
import _sum from 'lodash/fp/sum';
import { FloatingAction } from 'react-native-floating-action';
import { createSelector } from 'reselect';
import invariant from 'invariant';

import { viewerIsMember } from 'lib/shared/thread-utils';
import { threadSearchIndex } from 'lib/selectors/nav-selectors';
import SearchIndex from 'lib/shared/search-index';
import { connect } from 'lib/utils/redux-utils';
import {
  type ChatThreadItem,
  chatThreadItemPropType,
  chatListData,
  chatBackgroundListData,
} from 'lib/selectors/chat-selectors';

import ChatThreadListItem from './chat-thread-list-item.react';
import {
  ComposeThreadRouteName,
  MessageListRouteName,
} from '../navigation/route-names';
import { styleSelector } from '../themes/colors';
import Search from '../components/search.react';

const floatingActions = [
  {
    text: 'Compose',
    icon: <IonIcon name="md-create" size={24} color="#FFFFFF" />,
    name: 'compose',
    position: 1,
  },
];

type Item = ChatThreadItem | {| type: 'search', searchText: string |};

type Props = {|
  navigation: ChatNavigationProp<'ChatThreadList'>,
  // Redux state
  chatListData: $ReadOnlyArray<ChatThreadItem>,
  searchChatListData: $ReadOnlyArray<ChatThreadItem>,
  viewerID: ?string,
  threadSearchIndex: SearchIndex,
  styles: typeof styles,
|};
type State = {|
  searchText: string,
  searchResults: Set<string>,
|};
type PropsAndState = {| ...Props, ...State |};
class ChatThreadList extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
      dangerouslyGetParent: PropTypes.func.isRequired,
      isFocused: PropTypes.func.isRequired,
    }).isRequired,
    chatListData: PropTypes.arrayOf(chatThreadItemPropType).isRequired,
    viewerID: PropTypes.string,
    threadSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };
  state = {
    searchText: '',
    searchResults: new Set(),
  };
  searchInput: ?TextInput;
  flatList: ?FlatList<Item>;

  componentDidMount() {
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = this.props.navigation.dangerouslyGetParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.addListener('tabPress', this.onTabPress);
  }

  componentWillUnmount() {
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = this.props.navigation.dangerouslyGetParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.removeListener('tabPress', this.onTabPress);
  }

  onTabPress = () => {
    if (this.props.navigation.isFocused() && this.flatList) {
      this.flatList.scrollToOffset({ offset: 0, animated: true });
    }
  };

  renderItem = (row: { item: Item }) => {
    const item = row.item;
    if (item.type === 'search') {
      return (
        <Search
          searchText={this.state.searchText}
          onChangeText={this.onChangeSearchText}
          containerStyle={this.props.styles.search}
          placeholder="Search threads"
          ref={this.searchInputRef}
        />
      );
    }
    return <ChatThreadListItem data={item} onPressItem={this.onPressItem} />;
  };

  searchInputRef = (searchInput: ?TextInput) => {
    this.searchInput = searchInput;
  };

  static keyExtractor(item: Item) {
    if (item.threadInfo) {
      return item.threadInfo.id;
    } else {
      return 'search';
    }
  }

  static getItemLayout(data: ?$ReadOnlyArray<Item>, index: number) {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset = ChatThreadList.heightOfItems(
      data.filter((_, i) => i < index),
    );
    const item = data[index];
    const length = item ? ChatThreadList.itemHeight(item) : 0;
    return { length, offset, index };
  }

  static itemHeight(item: Item): number {
    if (item.type === 'search') {
      return Platform.OS === 'ios' ? 54.5 : 55;
    }
    return 60;
  }

  static heightOfItems(data: $ReadOnlyArray<Item>): number {
    return _sum(data.map(ChatThreadList.itemHeight));
  }

  listDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.chatListData,
    (propsAndState: PropsAndState) => propsAndState.searchChatListData,
    (propsAndState: PropsAndState) => propsAndState.searchText,
    (propsAndState: PropsAndState) => propsAndState.searchResults,
    (
      reduxChatListData: $ReadOnlyArray<ChatThreadItem>,
      allReduxChatListData: $ReadOnlyArray<ChatThreadItem>,
      searchText: string,
      searchResults: Set<string>,
    ): Item[] => {
      let chatItems;
      if (!searchText) {
        chatItems = reduxChatListData.filter(item =>
          viewerIsMember(item.threadInfo),
        );
      } else {
        chatItems = allReduxChatListData.filter(item =>
          searchResults.has(item.threadInfo.id),
        );
      }
      return [{ type: 'search', searchText }, ...chatItems];
    },
  );

  get listData() {
    return this.listDataSelector({ ...this.props, ...this.state });
  }

  render() {
    // this.props.viewerID is in extraData since it's used by MessagePreview
    // within ChatThreadListItem
    let floatingAction = null;
    if (Platform.OS === 'android') {
      floatingAction = (
        <FloatingAction
          actions={floatingActions}
          overrideWithAction
          onPressItem={this.composeThread}
          color="#66AA66"
        />
      );
    }
    return (
      <View style={this.props.styles.container}>
        <FlatList
          data={this.listData}
          renderItem={this.renderItem}
          keyExtractor={ChatThreadList.keyExtractor}
          getItemLayout={ChatThreadList.getItemLayout}
          extraData={this.props.viewerID}
          initialNumToRender={11}
          keyboardShouldPersistTaps="handled"
          style={this.props.styles.flatList}
          ref={this.flatListRef}
        />
        {floatingAction}
      </View>
    );
  }

  flatListRef = (flatList: ?FlatList<Item>) => {
    this.flatList = flatList;
  };

  onChangeSearchText = (searchText: string) => {
    const results = this.props.threadSearchIndex.getSearchResults(searchText);
    this.setState({ searchText, searchResults: new Set(results) });
  };

  onPressItem = (threadInfo: ThreadInfo) => {
    this.onChangeSearchText('');
    if (this.searchInput) {
      this.searchInput.blur();
    }
    this.props.navigation.navigate({
      name: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  };

  composeThread = () => {
    this.props.navigation.navigate({
      name: ComposeThreadRouteName,
      params: {},
    });
  };
}

const styles = {
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
  },
  search: {
    marginBottom: 8,
    marginHorizontal: 12,
    marginTop: Platform.OS === 'android' ? 10 : 8,
  },
  flatList: {
    flex: 1,
    backgroundColor: 'listBackground',
  },
};
const stylesSelector = styleSelector(styles);

export const HomeChatThreadList = connect((state: AppState) => ({
  chatListData: chatListData(state),
  searchChatListData: chatBackgroundListData(state).concat(chatListData(state)),
  viewerID: state.currentUserInfo && state.currentUserInfo.id,
  threadSearchIndex: threadSearchIndex(state),
  styles: stylesSelector(state),
}))(ChatThreadList);

export const BackgroundChatThreadList = connect((state: AppState) => ({
  chatListData: chatBackgroundListData(state),
  searchChatListData: chatBackgroundListData(state).concat(chatListData(state)),
  viewerID: state.currentUserInfo && state.currentUserInfo.id,
  threadSearchIndex: threadSearchIndex(state),
  styles: stylesSelector(state),
}))(ChatThreadList);
