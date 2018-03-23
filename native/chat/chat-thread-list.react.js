// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { ChatThreadItem } from '../selectors/chat-selectors';
import { chatThreadItemPropType } from '../selectors/chat-selectors';
import type { NavigationScreenProp, NavigationRoute } from 'react-navigation';

import * as React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Platform,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _sum from 'lodash/fp/sum';
import { FloatingAction } from 'react-native-floating-action';

import { viewerIsMember } from 'lib/shared/thread-utils';
import { threadSearchIndex } from 'lib/selectors/nav-selectors';
import SearchIndex from 'lib/shared/search-index';

import { chatListData } from '../selectors/chat-selectors';
import ChatThreadListItem from './chat-thread-list-item.react';
import { MessageListRouteName } from './message-list.react';
import ComposeThreadButton from './compose-thread-button.react';
import { registerChatScreen } from './chat-screen-registry';
import { ComposeThreadRouteName } from './compose-thread.react';
import { iosKeyboardOffset } from '../dimensions';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react';

const floatingActions = [{
  text: 'Compose',
  icon: (<IonIcon name="md-create" size={24} color="#FFFFFF" />),
  name: 'compose',
  position: 1,
}];

type Item = ChatThreadItem | {| type: "search", searchText: string |};

type Props = {|
  navigation: NavigationScreenProp<NavigationRoute>,
  // Redux state
  chatListData: $ReadOnlyArray<ChatThreadItem>,
  viewerID: ?string,
  threadSearchIndex: SearchIndex,
|};
type State = {|
  listData: $ReadOnlyArray<Item>,
  searchText: string,
  searchResults: Set<string>,
|};
class InnerChatThreadList extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
      }).isRequired,
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    chatListData: PropTypes.arrayOf(chatThreadItemPropType).isRequired,
    viewerID: PropTypes.string,
    threadSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: 'Threads',
    headerRight: Platform.OS === "ios"
      ? (<ComposeThreadButton navigate={navigation.navigate} />)
      : null,
    headerBackTitle: "Back",
  });

  constructor(props: Props) {
    super(props);
    this.state = {
      listData: [],
      searchText: "",
      searchResults: new Set(),
    };
    this.state.listData = InnerChatThreadList.listData(props, this.state);
  }

  componentDidMount() {
    registerChatScreen(this.props.navigation.state.key, this);
  }

  componentWillUnmount() {
    registerChatScreen(this.props.navigation.state.key, null);
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps.chatListData !== this.props.chatListData) {
      this.setState((prevState: State) => ({
        listData: InnerChatThreadList.listData(newProps, prevState),
      }));
    }
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (nextState.searchText !== this.state.searchText) {
      this.setState((prevState: State) => ({
        listData: InnerChatThreadList.listData(nextProps, nextState),
      }));
    }
  }

  canReset = () => false;

  renderItem = (row: { item: Item }) => {
    const item = row.item;
    if (item.type === "search") {
      return this.renderSearchBar();
    }
    return (
      <ChatThreadListItem data={item} onPressItem={this.onPressItem} />
    );
  }

  renderSearchBar = () => {
    let clearSearchInputIcon = null;
    if (this.state.searchText) {
      clearSearchInputIcon = (
        <TouchableOpacity
          onPress={this.onPressClearSearch}
          activeOpacity={0.5}
        >
          <Icon
            name="times-circle"
            size={18}
            color="#AAAAAA"
          />
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.searchContainer}>
        <View style={styles.search}>
          <Icon
            name="search"
            size={18}
            color="#AAAAAA"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            underlineColorAndroid="transparent"
            value={this.state.searchText}
            onChangeText={this.onChangeSearchText}
            placeholder="Search threads"
            placeholderTextColor="#AAAAAA"
            returnKeyType="go"
          />
          {clearSearchInputIcon}
        </View>
      </View>
    );
  }

  static keyExtractor(item: Item) {
    if (item.threadInfo) {
      return item.threadInfo.id;
    } else {
      return "search";
    }
  }

  static getItemLayout(
    data: ?$ReadOnlyArray<Item>,
    index: number,
  ) {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset =
      InnerChatThreadList.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? InnerChatThreadList.itemHeight(item) : 0;
    return { length, offset, index };
  }

  static itemHeight(item: Item): number {
    if (item.type === "search") {
      return Platform.OS === "ios" ? 54.5 : 55;
    }
    return 60;
  }

  static heightOfItems(data: $ReadOnlyArray<Item>): number {
    return _sum(data.map(InnerChatThreadList.itemHeight));
  }

  static listData(props: Props, state: State) {
    let chatItems;
    if (!state.searchText) {
      chatItems = props.chatListData.filter(
        item => viewerIsMember(item.threadInfo),
      );
    } else {
      chatItems = props.chatListData.filter(
        item => state.searchResults.has(item.threadInfo.id),
      );
    }
    return [
      { type: "search", searchText: state.searchText },
      ...chatItems,
    ];
  }

  render() {
    // this.props.viewerID is in extraData since it's used by MessagePreview
    // within ChatThreadListItem
    let floatingAction = null;
    if (Platform.OS === "android") {
      floatingAction = (
        <FloatingAction
          actions={floatingActions}
          overrideWithAction
          onPressItem={this.composeThread}
          buttonColor="#66AA66"
        />
      );
    }
    const content = (
      <React.Fragment>
        <FlatList
          data={this.state.listData}
          renderItem={this.renderItem}
          keyExtractor={InnerChatThreadList.keyExtractor}
          getItemLayout={InnerChatThreadList.getItemLayout}
          extraData={this.props.viewerID}
          initialNumToRender={11}
          keyboardShouldPersistTaps="handled"
          style={styles.flatList}
        />
        {floatingAction}
      </React.Fragment>
    );
    if (Platform.OS === "ios") {
      return (
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={iosKeyboardOffset}
        >{content}</KeyboardAvoidingView>
      );
    } else {
      return <View style={styles.container}>{content}</View>;
    }
  }

  onChangeSearchText = (searchText: string) => {
    const results = this.props.threadSearchIndex.getSearchResults(searchText);
    this.setState({ searchText, searchResults: new Set(results) });
  }

  onPressClearSearch = () => {
    this.onChangeSearchText("");
  }

  onPressItem = (threadInfo: ThreadInfo) => {
    this.props.navigation.navigate(
      MessageListRouteName,
      { threadInfo },
    );
  }

  composeThread = () => {
    this.props.navigation.navigate(ComposeThreadRouteName, {});
  }

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    backgroundColor: '#F6F6F6',
    borderBottomWidth: 1,
    borderColor: '#DDDDDD',
    marginBottom: 5,
  },
  searchIcon: {
    paddingBottom: Platform.OS === "android" ? 0 : 2,
  },
  search: {
    backgroundColor: '#DDDDDD',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    marginTop: Platform.OS === "android" ? 10 : 8,
    paddingLeft: 14,
    paddingRight: 12,
    paddingTop: Platform.OS === "android" ? 1 : 6,
    paddingBottom: Platform.OS === "android" ? 2 : 6,
    borderRadius: 6,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 0,
    marginVertical: 0,
  },
  flatList: {
    flex: 1,
    backgroundColor: 'white',
  },
});

const ChatThreadListRouteName = 'ChatThreadList';
const ChatThreadList = connect((state: AppState): * => ({
  chatListData: chatListData(state),
  viewerID: state.currentUserInfo && state.currentUserInfo.id,
  threadSearchIndex: threadSearchIndex(state),
}))(InnerChatThreadList);

export {
  ChatThreadList,
  ChatThreadListRouteName,
};
