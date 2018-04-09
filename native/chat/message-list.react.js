// @flow

import type { AppState } from '../redux-setup';
import type { NavigationScreenProp, NavigationRoute } from 'react-navigation';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type {
  ChatMessageItem,
  ChatMessageInfoItem,
} from '../selectors/chat-selectors';
import { chatMessageItemPropType } from '../selectors/chat-selectors';
import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper';
import {
  type TextMessageInfo,
  type RobotextMessageInfo,
  type FetchMessageInfosPayload,
  messageTypes,
} from 'lib/types/message-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { TextToMeasure } from '../text-height-measurer.react';

import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  FlatList,
  DeviceInfo,
} from 'react-native';
import invariant from 'invariant';
import _sum from 'lodash/fp/sum';
import _differenceWith from 'lodash/fp/differenceWith';
import _find from 'lodash/fp/find';
import _isEqual from 'lodash/fp/isEqual';

import { messageKey, robotextToRawString } from 'lib/shared/message-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
} from 'lib/actions/message-actions';
import threadWatcher from 'lib/shared/thread-watcher';
import { viewerIsMember } from 'lib/shared/thread-utils';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import { messageListData } from '../selectors/chat-selectors';
import { Message, messageItemHeight } from './message.react';
import TextHeightMeasurer from '../text-height-measurer.react';
import ChatInputBar from './chat-input-bar.react';
import ListLoadingIndicator from '../list-loading-indicator.react';
import MessageListHeaderTitle from './message-list-header-title.react';
import { registerChatScreen } from './chat-screen-registry';
import ThreadSettingsButton from './thread-settings-button.react';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react';

type NavProp = NavigationScreenProp<NavigationRoute>
  & { state: { params: { threadInfo: ThreadInfo } } };

export type RobotextChatMessageInfoItemWithHeight = {|
  itemType: "message",
  messageInfo: RobotextMessageInfo,
  threadInfo: ThreadInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
  robotext: string,
  textHeight: number,
|};

export type ChatMessageInfoItemWithHeight =
  RobotextChatMessageInfoItemWithHeight | {|
    itemType: "message",
    messageInfo: TextMessageInfo,
    threadInfo: ThreadInfo,
    startsConversation: bool,
    startsCluster: bool,
    endsCluster: bool,
    textHeight: number,
  |};
type ChatMessageItemWithHeight =
  {| itemType: "loader" |} |
  ChatMessageInfoItemWithHeight;

type Props = {
  navigation: NavProp,
  // Redux state
  messageListData: $ReadOnlyArray<ChatMessageItem>,
  viewerID: ?string,
  startReached: bool,
  threadInfo: ?ThreadInfo,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  fetchMessagesBeforeCursor: (
    threadID: string,
    beforeMessageID: string,
  ) => Promise<FetchMessageInfosPayload>,
  fetchMostRecentMessages: (
    threadID: string,
  ) => Promise<FetchMessageInfosPayload>,
};
type State = {
  textToMeasure: TextToMeasure[],
  listDataWithHeights: ?$ReadOnlyArray<ChatMessageItemWithHeight>,
  focusedMessageKey: ?string,
};
class InnerMessageList extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
        params: PropTypes.shape({
          threadInfo: threadInfoPropType.isRequired,
        }).isRequired,
      }).isRequired,
      navigate: PropTypes.func.isRequired,
      setParams: PropTypes.func.isRequired,
    }).isRequired,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType).isRequired,
    viewerID: PropTypes.string,
    startReached: PropTypes.bool.isRequired,
    threadInfo: threadInfoPropType,
    dispatchActionPromise: PropTypes.func.isRequired,
    fetchMessagesBeforeCursor: PropTypes.func.isRequired,
    fetchMostRecentMessages: PropTypes.func.isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    headerTitle: (
      <MessageListHeaderTitle
        threadInfo={navigation.state.params.threadInfo}
        navigate={navigation.navigate}
      />
    ),
    headerRight:
      Platform.OS === "android"
        ? (
            <ThreadSettingsButton
              threadInfo={navigation.state.params.threadInfo}
              navigate={navigation.navigate}
            />
          )
        : null,
    headerBackTitle: "Back",
  });
  textHeights: ?Map<string, number> = null;
  loadingFromScroll = false;

  constructor(props: Props) {
    super(props);
    const textToMeasure = props.messageListData
      ? InnerMessageList.textToMeasureFromListData(props.messageListData)
      : [];
    this.state = {
      textToMeasure,
      listDataWithHeights: null,
      focusedMessageKey: null,
    };
  }

  static getThreadInfo(props: Props): ThreadInfo {
    return props.navigation.state.params.threadInfo;
  }

  componentDidMount() {
    const threadInfo = InnerMessageList.getThreadInfo(this.props);
    registerChatScreen(this.props.navigation.state.key, this);
    if (!viewerIsMember(threadInfo)) {
      threadWatcher.watchID(threadInfo.id);
      this.props.dispatchActionPromise(
        fetchMostRecentMessagesActionTypes,
        this.props.fetchMostRecentMessages(threadInfo.id),
      );
    }
  }

  componentWillUnmount() {
    const threadInfo = InnerMessageList.getThreadInfo(this.props);
    registerChatScreen(this.props.navigation.state.key, null);
    if (!viewerIsMember(threadInfo)) {
      threadWatcher.removeID(threadInfo.id);
    }
  }

  canReset = () => true;

  static textToMeasureFromListData(listData: $ReadOnlyArray<ChatMessageItem>) {
    const textToMeasure = [];
    for (let item of listData) {
      if (item.itemType !== "message") {
        continue;
      }
      const messageInfo = item.messageInfo;
      if (messageInfo.type === messageTypes.TEXT) {
        textToMeasure.push({
          id: messageKey(messageInfo),
          text: messageInfo.text,
          style: styles.text,
        });
      } else {
        invariant(
          item.robotext && typeof item.robotext === "string",
          "Flow can't handle our fancy types :(",
        );
        textToMeasure.push({
          id: messageKey(messageInfo),
          text: robotextToRawString(item.robotext),
          style: styles.robotext,
        });
      }
    }
    return textToMeasure;
  }

  componentWillReceiveProps(nextProps: Props) {
    const oldThreadInfo = InnerMessageList.getThreadInfo(this.props);
    const newThreadInfo = nextProps.threadInfo;

    let threadInfoChanged = false;
    if (newThreadInfo && !_isEqual(newThreadInfo)(oldThreadInfo)) {
      threadInfoChanged = true;
      this.props.navigation.setParams({ threadInfo: newThreadInfo });
    }

    if (
      viewerIsMember(oldThreadInfo) &&
      !viewerIsMember(newThreadInfo)
    ) {
      threadWatcher.watchID(oldThreadInfo.id);
    } else if (
      !viewerIsMember(oldThreadInfo) &&
      viewerIsMember(newThreadInfo)
    ) {
      threadWatcher.removeID(oldThreadInfo.id);
    }

    const oldListData = this.props.messageListData;
    const newListData = nextProps.messageListData;
    if (!newListData && oldListData) {
      this.setState({
        textToMeasure: [],
        listDataWithHeights: null,
        focusedMessageKey: null,
      });
    }
    if (!newListData) {
      return;
    }

    if (newListData === oldListData && !threadInfoChanged) {
      return;
    }

    const newTextToMeasure = InnerMessageList.textToMeasureFromListData(
      newListData,
    );

    let allTextAlreadyMeasured = false;
    if (this.textHeights) {
      allTextAlreadyMeasured = true;
      for (let textToMeasure of newTextToMeasure) {
        if (!this.textHeights.has(textToMeasure.id)) {
          allTextAlreadyMeasured = false;
          break;
        }
      }
    }

    if (allTextAlreadyMeasured) {
      this.mergeHeightsIntoListData(newListData);
      return;
    }

    const newText =
      _differenceWith(_isEqual)(newTextToMeasure)(this.state.textToMeasure);
    if (newText.length === 0) {
      // Since we don't have everything in textHeights, but we do have
      // everything in textToMeasure, we can conclude that we're just
      // waiting for the measurement to complete and then we'll be good.
    } else {
      // We set textHeights to null here since if a future set of text
      // came in before we completed text measurement that was a subset
      // of the earlier text, we would end up merging directly there, but
      // then when the measurement for the middle text came in it would
      // override the newer text heights.
      this.textHeights = null;
      this.setState({ textToMeasure: newTextToMeasure });
    }
  }

  mergeHeightsIntoListData(listData: $ReadOnlyArray<ChatMessageItem>) {
    const threadInfo = InnerMessageList.getThreadInfo(this.props);
    const textHeights = this.textHeights;
    invariant(textHeights, "textHeights should be set");
    const listDataWithHeights = listData.map((item: ChatMessageItem) => {
      if (item.itemType !== "message") {
        return item;
      }
      const textHeight = textHeights.get(messageKey(item.messageInfo));
      invariant(
        textHeight,
        `height for ${messageKey(item.messageInfo)} should be set`,
      );
      if (item.messageInfo.type === messageTypes.TEXT) {
        return {
          itemType: "message",
          messageInfo: item.messageInfo,
          threadInfo,
          startsConversation: item.startsConversation,
          startsCluster: item.startsCluster,
          endsCluster: item.endsCluster,
          textHeight,
        };
      } else {
        invariant(
          typeof item.robotext === "string",
          "Flow can't handle our fancy types :(",
        );
        return {
          itemType: "message",
          messageInfo: item.messageInfo,
          threadInfo,
          startsConversation: item.startsConversation,
          startsCluster: item.startsCluster,
          endsCluster: item.endsCluster,
          robotext: item.robotext,
          textHeight,
        };
      }
    });
    this.setState({ listDataWithHeights });
  }

  renderItem = (row: { item: ChatMessageItemWithHeight }) => {
    if (row.item.itemType === "loader") {
      return <ListLoadingIndicator />;
    }
    const messageInfoItem: ChatMessageInfoItemWithHeight = row.item;
    const focused =
      messageKey(messageInfoItem.messageInfo) === this.state.focusedMessageKey;
    return (
      <Message
        item={messageInfoItem}
        focused={focused}
        toggleFocus={this.toggleMessageFocus}
      />
    );
  }

  toggleMessageFocus = (messageKey: string) => {
    if (this.state.focusedMessageKey === messageKey) {
      this.setState({ focusedMessageKey: null });
    } else {
      this.setState({ focusedMessageKey: messageKey });
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!this.loadingFromScroll || !this.state.listDataWithHeights) {
      return;
    }
    if (
      !prevState.listDataWithHeights ||
      this.state.listDataWithHeights.length >
        prevState.listDataWithHeights.length ||
      this.props.startReached
    ) {
      this.loadingFromScroll = false;
    }
  }

  static keyExtractor(item: ChatMessageItemWithHeight) {
    if (item.itemType === "loader") {
      return "loader";
    }
    return messageKey(item.messageInfo);
  }

  getItemLayout = (
    data: ?$ReadOnlyArray<ChatMessageItemWithHeight>,
    index: number,
  ) => {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset = this.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? this.itemHeight(item) : 0;
    return { length, offset, index };
  }

  itemHeight = (item: ChatMessageItemWithHeight): number => {
    if (item.itemType === "loader") {
      return 56;
    }
    return messageItemHeight(item, this.props.viewerID);
  }

  heightOfItems(data: $ReadOnlyArray<ChatMessageItemWithHeight>): number {
    return _sum(data.map(this.itemHeight));
  }

  static ListFooterComponent(props: {}) {
    // Actually header, it's just that our FlatList is inverted
    return <View style={styles.header} />;
  }

  render() {
    const textHeightMeasurer = (
      <TextHeightMeasurer
        textToMeasure={this.state.textToMeasure}
        allHeightsMeasuredCallback={this.allHeightsMeasured}
      />
    );
    const listDataWithHeights = this.state.listDataWithHeights;
    let flatList = null;
    if (listDataWithHeights) {
      const footer = this.props.startReached
        ? InnerMessageList.ListFooterComponent
        : undefined;
      flatList = (
        <FlatList
          inverted={true}
          data={listDataWithHeights}
          renderItem={this.renderItem}
          keyExtractor={InnerMessageList.keyExtractor}
          getItemLayout={this.getItemLayout}
          onViewableItemsChanged={this.onViewableItemsChanged}
          ListFooterComponent={footer}
          scrollsToTop={false}
          extraData={this.state.focusedMessageKey}
        />
      );
    } else {
      flatList = (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator
            color="black"
            size="large"
            style={styles.loadingIndicator}
          />
        </View>
      );
    }

    const threadInfo = InnerMessageList.getThreadInfo(this.props);
    const inputBar = <ChatInputBar threadInfo={threadInfo} />;

    return (
      <KeyboardAvoidingView style={styles.container}>
        {textHeightMeasurer}
        <View style={styles.flatListContainer}>
          {flatList}
        </View>
        {inputBar}
      </KeyboardAvoidingView>
    );
  }

  allHeightsMeasured = (
    textToMeasure: TextToMeasure[],
    newTextHeights: Map<string, number>,
  ) => {
    if (textToMeasure !== this.state.textToMeasure) {
      return;
    }
    this.textHeights = newTextHeights;
    if (this.props.messageListData) {
      this.mergeHeightsIntoListData(this.props.messageListData);
    }
  }

  onViewableItemsChanged = (info: {
    viewableItems: ViewToken[],
    changed: ViewToken[],
  }) => {
    if (this.state.focusedMessageKey) {
      let focusedMessageVisible = false;
      for (let token of info.viewableItems) {
        if (
          token.item.itemType === "message" &&
          messageKey(token.item.messageInfo) === this.state.focusedMessageKey
        ) {
          focusedMessageVisible = true;
          break;
        }
      }
      if (!focusedMessageVisible) {
        this.setState({ focusedMessageKey: null });
      }
    }

    const loader = _find({ key: "loader" })(info.viewableItems);
    if (!loader || this.loadingFromScroll) {
      return;
    }

    const oldestMessageServerID = this.oldestMessageServerID();
    if (oldestMessageServerID) {
      this.loadingFromScroll = true;
      const threadID = InnerMessageList.getThreadInfo(this.props).id;
      this.props.dispatchActionPromise(
        fetchMessagesBeforeCursorActionTypes,
        this.props.fetchMessagesBeforeCursor(
          threadID,
          oldestMessageServerID,
        ),
      );
    }
  }

  oldestMessageServerID(): ?string {
    const data = this.props.messageListData;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].itemType === "message" && data[i].messageInfo.id) {
        return data[i].messageInfo.id;
      }
    }
    return null;
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  text: {
    left: 24,
    right: 24,
    fontSize: 18,
    fontFamily: 'Arial',
  },
  robotext: {
    left: 24,
    right: 24,
    fontSize: 15,
    fontFamily: 'Arial',
  },
  loadingIndicator: {
    flex: 1,
  },
  loadingIndicatorContainer: {
    flex: 1,
  },
  header: {
    height: 12,
  },
});

registerFetchKey(fetchMessagesBeforeCursorActionTypes);
registerFetchKey(fetchMostRecentMessagesActionTypes);

const MessageListRouteName = 'MessageList';
const MessageList = connect(
  (state: AppState, ownProps: { navigation: NavProp }) => {
    const threadID = ownProps.navigation.state.params.threadInfo.id;
    return {
      messageListData: messageListData(threadID)(state),
      viewerID: state.currentUserInfo && state.currentUserInfo.id,
      startReached: !!(state.messageStore.threads[threadID] &&
        state.messageStore.threads[threadID].startReached),
      threadInfo: threadInfoSelector(state)[threadID],
    };
  },
  { fetchMessagesBeforeCursor, fetchMostRecentMessages },
)(InnerMessageList);

export {
  MessageList,
  MessageListRouteName,
};
