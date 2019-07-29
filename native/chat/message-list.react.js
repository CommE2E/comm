// @flow

import type { AppState } from '../redux/redux-setup';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper';
import type { FetchMessageInfosPayload } from 'lib/types/message-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ChatMessageItemWithHeight } from './message-list-container.react';
import type { VerticalBounds } from '../types/lightbox-types';
import {
  type MessageListNavProp,
  messageListNavPropType,
} from './message-list-types';
import {
  type OverlayableScrollViewState,
  overlayableScrollViewStatePropType,
  withOverlayableScrollViewState,
} from '../navigation/overlayable-scroll-view-state';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../navigation/keyboard-state';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import _sum from 'lodash/fp/sum';
import _find from 'lodash/fp/find';
import { createSelector } from 'reselect';

import { messageKey } from 'lib/shared/message-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
} from 'lib/actions/message-actions';
import threadWatcher from 'lib/shared/thread-watcher';
import { threadInChatList } from 'lib/shared/thread-utils';
import { registerFetchKey } from 'lib/reducers/loading-reducer';

import {
  Message,
  messageItemHeight,
  type ChatMessageInfoItemWithHeight,
} from './message.react';
import ListLoadingIndicator from '../components/list-loading-indicator.react';
import {
  scrollBlockingChatModalsClosedSelector,
} from '../selectors/nav-selectors';

type Props = {|
  threadInfo: ThreadInfo,
  messageListData: $ReadOnlyArray<ChatMessageItemWithHeight>,
  navigation: MessageListNavProp,
  // Redux state
  viewerID: ?string,
  startReached: bool,
  scrollBlockingModalsClosed: bool,
  // withOverlayableScrollViewState
  overlayableScrollViewState: ?OverlayableScrollViewState,
  // withKeyboardState
  keyboardState: ?KeyboardState,
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
|};
type State = {|
  focusedMessageKey: ?string,
  messageListVerticalBounds: ?VerticalBounds,
  flatListExtraData: FlatListExtraData,
|};
type PropsAndState = {|
  ...Props,
  ...State,
|};
type FlatListExtraData = {|
  messageListVerticalBounds: ?VerticalBounds,
  focusedMessageKey: ?string,
  navigation: MessageListNavProp,
|};
class MessageList extends React.PureComponent<Props, State> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType).isRequired,
    navigation: messageListNavPropType.isRequired,
    viewerID: PropTypes.string,
    startReached: PropTypes.bool.isRequired,
    scrollBlockingModalsClosed: PropTypes.bool.isRequired,
    overlayableScrollViewState: overlayableScrollViewStatePropType,
    keyboardState: keyboardStatePropType,
    dispatchActionPromise: PropTypes.func.isRequired,
    fetchMessagesBeforeCursor: PropTypes.func.isRequired,
    fetchMostRecentMessages: PropTypes.func.isRequired,
  };
  loadingFromScroll = false;
  flatListContainer: ?View;

  constructor(props: Props) {
    super(props);
    this.state = {
      focusedMessageKey: null,
      messageListVerticalBounds: null,
      flatListExtraData: {
        messageListVerticalBounds: null,
        focusedMessageKey: null,
        navigation: props.navigation,
      },
    };
  }

  static flatListExtraDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.messageListVerticalBounds,
    (propsAndState: PropsAndState) => propsAndState.focusedMessageKey,
    (propsAndState: PropsAndState) => propsAndState.navigation,
    (
      messageListVerticalBounds: ?VerticalBounds,
      focusedMessageKey: ?string,
      navigation: MessageListNavProp,
    ) => ({
      messageListVerticalBounds,
      focusedMessageKey,
      navigation,
    }),
  );

  static getDerivedStateFromProps(props: Props, state: State) {
    const flatListExtraData = MessageList.flatListExtraDataSelector({
      ...props,
      ...state,
    });
    if (flatListExtraData !== state.flatListExtraData) {
      return { flatListExtraData };
    }
    return null;
  }

  componentDidMount() {
    const { threadInfo } = this.props;
    if (!threadInChatList(threadInfo)) {
      threadWatcher.watchID(threadInfo.id);
      this.props.dispatchActionPromise(
        fetchMostRecentMessagesActionTypes,
        this.props.fetchMostRecentMessages(threadInfo.id),
      );
    }
  }

  componentWillUnmount() {
    const { threadInfo } = this.props;
    if (!threadInChatList(threadInfo)) {
      threadWatcher.removeID(threadInfo.id);
    }
  }

  static scrollDisabled(props: Props) {
    const { overlayableScrollViewState } = props;
    return !!(overlayableScrollViewState &&
      overlayableScrollViewState.scrollDisabled);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const oldThreadInfo = prevProps.threadInfo;
    const newThreadInfo = this.props.threadInfo;
    if (
      threadInChatList(oldThreadInfo) &&
      !threadInChatList(newThreadInfo)
    ) {
      threadWatcher.watchID(oldThreadInfo.id);
    } else if (
      !threadInChatList(oldThreadInfo) &&
      threadInChatList(newThreadInfo)
    ) {
      threadWatcher.removeID(oldThreadInfo.id);
    }

    const newListData = this.props.messageListData;
    const oldListData = prevProps.messageListData;
    if (
      this.loadingFromScroll &&
      (newListData.length > oldListData.length || this.props.startReached)
    ) {
      this.loadingFromScroll = false;
    }

    if (
      this.props.scrollBlockingModalsClosed &&
      !prevProps.scrollBlockingModalsClosed
    ) {
      this.setState({ focusedMessageKey: null });
    }

    const scrollIsDisabled = MessageList.scrollDisabled(this.props);
    const scrollWasDisabled = MessageList.scrollDisabled(prevProps);
    if (!scrollWasDisabled && scrollIsDisabled) {
      this.props.navigation.setParams({ gesturesDisabled: true });
    } else if (scrollWasDisabled && !scrollIsDisabled) {
      this.props.navigation.setParams({ gesturesDisabled: false });
    }
  }

  dismissKeyboard = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  }

  renderItem = (row: { item: ChatMessageItemWithHeight }) => {
    if (row.item.itemType === "loader") {
      return (
        <TouchableWithoutFeedback onPress={this.dismissKeyboard}>
          <View style={styles.listLoadingIndicator}>
            <ListLoadingIndicator />
          </View>
        </TouchableWithoutFeedback>
      );
    }
    const messageInfoItem: ChatMessageInfoItemWithHeight = row.item;
    const {
      messageListVerticalBounds,
      focusedMessageKey,
      navigation,
    } = this.state.flatListExtraData;
    const focused =
      messageKey(messageInfoItem.messageInfo) === focusedMessageKey;
    return (
      <Message
        item={messageInfoItem}
        focused={focused}
        navigation={navigation}
        toggleFocus={this.toggleMessageFocus}
        verticalBounds={messageListVerticalBounds}
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
    const { messageListData, startReached } = this.props;
    const footer = startReached ? MessageList.ListFooterComponent : undefined;
    return (
      <View
        style={styles.container}
        ref={this.flatListContainerRef}
        onLayout={this.onFlatListContainerLayout}
      >
        <FlatList
          inverted={true}
          data={messageListData}
          renderItem={this.renderItem}
          keyExtractor={MessageList.keyExtractor}
          getItemLayout={this.getItemLayout}
          onViewableItemsChanged={this.onViewableItemsChanged}
          ListFooterComponent={footer}
          scrollsToTop={false}
          scrollEnabled={!MessageList.scrollDisabled(this.props)}
          extraData={this.state.flatListExtraData}
        />
      </View>
    );
  }

  flatListContainerRef = (flatListContainer: ?View) => {
    this.flatListContainer = flatListContainer;
  }

  onFlatListContainerLayout = () => {
    const { flatListContainer } = this;
    if (!flatListContainer) {
      return;
    }
    flatListContainer.measure((x, y, width, height, pageX, pageY) => {
      if (
        height === null || height === undefined ||
        pageY === null || pageY === undefined
      ) {
        return;
      }
      this.setState({ messageListVerticalBounds: { height, y: pageY } });
    });
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
      const threadID = this.props.threadInfo.id;
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 12,
  },
  listLoadingIndicator: {
    flex: 1,
  },
});

registerFetchKey(fetchMessagesBeforeCursorActionTypes);
registerFetchKey(fetchMostRecentMessagesActionTypes);

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    const threadID = ownProps.threadInfo.id;
    return {
      viewerID: state.currentUserInfo && state.currentUserInfo.id,
      startReached: !!(state.messageStore.threads[threadID] &&
        state.messageStore.threads[threadID].startReached),
      scrollBlockingModalsClosed: scrollBlockingChatModalsClosedSelector(state),
    };
  },
  { fetchMessagesBeforeCursor, fetchMostRecentMessages },
)(withKeyboardState(withOverlayableScrollViewState(MessageList)));
