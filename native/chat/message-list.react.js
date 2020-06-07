// @flow

import type { AppState } from '../redux/redux-setup';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { ViewToken } from '../types/react-native';
import type { FetchMessageInfosPayload } from 'lib/types/message-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ChatMessageItemWithHeight } from './message-list-container.react';
import type { VerticalBounds } from '../types/layout-types';
import {
  messageListRoutePropType,
  messageListNavPropType,
} from './message-list-types';
import type { ChatNavigationProp } from './chat.react';
import type { NavigationRoute } from '../navigation/route-names';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, TouchableWithoutFeedback } from 'react-native';
import _sum from 'lodash/fp/sum';
import _find from 'lodash/fp/find';
import { createSelector } from 'reselect';
import invariant from 'invariant';

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
import ChatList from '../components/chat-list.react';

import {
  Message,
  messageItemHeight,
  type ChatMessageInfoItemWithHeight,
} from './message.react';
import ListLoadingIndicator from '../components/list-loading-indicator.react';
import { styleSelector } from '../themes/colors';
import {
  withOverlayContext,
  type OverlayContextType,
  overlayContextPropType,
} from '../navigation/overlay-context';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../keyboard/keyboard-state';

type Props = {|
  threadInfo: ThreadInfo,
  messageListData: $ReadOnlyArray<ChatMessageItemWithHeight>,
  navigation: ChatNavigationProp<'MessageList'>,
  route: NavigationRoute<'MessageList'>,
  // Redux state
  startReached: boolean,
  styles: typeof styles,
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
  // withOverlayContext
  overlayContext: ?OverlayContextType,
  // withKeyboardState
  keyboardState: ?KeyboardState,
|};
type State = {|
  focusedMessageKey: ?string,
  messageListVerticalBounds: ?VerticalBounds,
  loadingFromScroll: boolean,
|};
type PropsAndState = {|
  ...Props,
  ...State,
|};
type FlatListExtraData = {|
  messageListVerticalBounds: ?VerticalBounds,
  focusedMessageKey: ?string,
  navigation: ChatNavigationProp<'MessageList'>,
  route: NavigationRoute<'MessageList'>,
|};
class MessageList extends React.PureComponent<Props, State> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType).isRequired,
    navigation: messageListNavPropType.isRequired,
    route: messageListRoutePropType.isRequired,
    startReached: PropTypes.bool.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    fetchMessagesBeforeCursor: PropTypes.func.isRequired,
    fetchMostRecentMessages: PropTypes.func.isRequired,
    overlayContext: overlayContextPropType,
    keyboardState: keyboardStatePropType,
  };
  state = {
    focusedMessageKey: null,
    messageListVerticalBounds: null,
    loadingFromScroll: false,
  };
  flatListContainer: ?View;

  flatListExtraDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.messageListVerticalBounds,
    (propsAndState: PropsAndState) => propsAndState.focusedMessageKey,
    (propsAndState: PropsAndState) => propsAndState.navigation,
    (propsAndState: PropsAndState) => propsAndState.route,
    (
      messageListVerticalBounds: ?VerticalBounds,
      focusedMessageKey: ?string,
      navigation: ChatNavigationProp<'MessageList'>,
      route: NavigationRoute<'MessageList'>,
    ) => ({
      messageListVerticalBounds,
      focusedMessageKey,
      navigation,
      route,
    }),
  );

  get flatListExtraData(): FlatListExtraData {
    return this.flatListExtraDataSelector({ ...this.props, ...this.state });
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

  static getOverlayContext(props: Props) {
    const { overlayContext } = props;
    invariant(overlayContext, 'MessageList should have OverlayContext');
    return overlayContext;
  }

  static scrollDisabled(props: Props) {
    const overlayContext = MessageList.getOverlayContext(props);
    return overlayContext.scrollBlockingModalStatus !== 'closed';
  }

  static modalOpen(props: Props) {
    const overlayContext = MessageList.getOverlayContext(props);
    return overlayContext.scrollBlockingModalStatus === 'open';
  }

  componentDidUpdate(prevProps: Props) {
    const oldThreadInfo = prevProps.threadInfo;
    const newThreadInfo = this.props.threadInfo;
    if (oldThreadInfo.id !== newThreadInfo.id) {
      if (!threadInChatList(oldThreadInfo)) {
        threadWatcher.removeID(oldThreadInfo.id);
      }
      if (!threadInChatList(newThreadInfo)) {
        threadWatcher.watchID(newThreadInfo.id);
      }
    }

    const newListData = this.props.messageListData;
    const oldListData = prevProps.messageListData;
    if (
      this.state.loadingFromScroll &&
      (newListData.length > oldListData.length || this.props.startReached)
    ) {
      this.setState({ loadingFromScroll: false });
    }

    const modalIsOpen = MessageList.modalOpen(this.props);
    const modalWasOpen = MessageList.modalOpen(prevProps);
    if (!modalIsOpen && modalWasOpen) {
      this.setState({ focusedMessageKey: null });
    }

    const scrollIsDisabled = MessageList.scrollDisabled(this.props);
    const scrollWasDisabled = MessageList.scrollDisabled(prevProps);
    if (!scrollWasDisabled && scrollIsDisabled) {
      this.props.navigation.setOptions({ gestureEnabled: false });
    } else if (scrollWasDisabled && !scrollIsDisabled) {
      this.props.navigation.setOptions({ gestureEnabled: true });
    }
  }

  dismissKeyboard = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  };

  renderItem = (row: { item: ChatMessageItemWithHeight }) => {
    if (row.item.itemType === 'loader') {
      return (
        <TouchableWithoutFeedback onPress={this.dismissKeyboard}>
          <View style={this.props.styles.listLoadingIndicator}>
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
      route,
    } = this.flatListExtraData;
    const focused =
      messageKey(messageInfoItem.messageInfo) === focusedMessageKey;
    return (
      <Message
        item={messageInfoItem}
        focused={focused}
        navigation={navigation}
        route={route}
        toggleFocus={this.toggleMessageFocus}
        verticalBounds={messageListVerticalBounds}
      />
    );
  };

  toggleMessageFocus = (inMessageKey: string) => {
    if (this.state.focusedMessageKey === inMessageKey) {
      this.setState({ focusedMessageKey: null });
    } else {
      this.setState({ focusedMessageKey: inMessageKey });
    }
  };

  static keyExtractor(item: ChatMessageItemWithHeight) {
    if (item.itemType === 'loader') {
      return 'loader';
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
  };

  itemHeight = (item: ChatMessageItemWithHeight): number => {
    if (item.itemType === 'loader') {
      return 56;
    }
    return messageItemHeight(item);
  };

  heightOfItems(data: $ReadOnlyArray<ChatMessageItemWithHeight>): number {
    return _sum(data.map(this.itemHeight));
  }

  // Actually header, it's just that our FlatList is inverted
  ListFooterComponent = () => <View style={this.props.styles.header} />;

  render() {
    const { messageListData, startReached } = this.props;
    const footer = startReached ? this.ListFooterComponent : undefined;
    return (
      <View
        style={this.props.styles.container}
        ref={this.flatListContainerRef}
        onLayout={this.onFlatListContainerLayout}
      >
        <ChatList
          loadingFromScroll={this.state.loadingFromScroll}
          navigation={this.props.navigation}
          inverted={true}
          data={messageListData}
          renderItem={this.renderItem}
          keyExtractor={MessageList.keyExtractor}
          getItemLayout={this.getItemLayout}
          onViewableItemsChanged={this.onViewableItemsChanged}
          ListFooterComponent={footer}
          scrollsToTop={false}
          scrollEnabled={!MessageList.scrollDisabled(this.props)}
          extraData={this.flatListExtraData}
        />
      </View>
    );
  }

  flatListContainerRef = (flatListContainer: ?View) => {
    this.flatListContainer = flatListContainer;
  };

  onFlatListContainerLayout = () => {
    const { flatListContainer } = this;
    if (!flatListContainer) {
      return;
    }
    flatListContainer.measure((x, y, width, height, pageX, pageY) => {
      if (
        height === null ||
        height === undefined ||
        pageY === null ||
        pageY === undefined
      ) {
        return;
      }
      this.setState({ messageListVerticalBounds: { height, y: pageY } });
    });
  };

  onViewableItemsChanged = (info: {
    viewableItems: ViewToken[],
    changed: ViewToken[],
  }) => {
    if (this.state.focusedMessageKey) {
      let focusedMessageVisible = false;
      for (let token of info.viewableItems) {
        if (
          token.item.itemType === 'message' &&
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

    const loader = _find({ key: 'loader' })(info.viewableItems);
    if (!loader || this.state.loadingFromScroll) {
      return;
    }

    const oldestMessageServerID = this.oldestMessageServerID();
    if (oldestMessageServerID) {
      this.setState({ loadingFromScroll: true });
      const threadID = this.props.threadInfo.id;
      this.props.dispatchActionPromise(
        fetchMessagesBeforeCursorActionTypes,
        this.props.fetchMessagesBeforeCursor(threadID, oldestMessageServerID),
      );
    }
  };

  oldestMessageServerID(): ?string {
    const data = this.props.messageListData;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].itemType === 'message' && data[i].messageInfo.id) {
        return data[i].messageInfo.id;
      }
    }
    return null;
  }
}

const styles = {
  container: {
    backgroundColor: 'listBackground',
    flex: 1,
  },
  header: {
    height: 12,
  },
  listLoadingIndicator: {
    flex: 1,
  },
};
const stylesSelector = styleSelector(styles);

registerFetchKey(fetchMessagesBeforeCursorActionTypes);
registerFetchKey(fetchMostRecentMessagesActionTypes);

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    const threadID = ownProps.threadInfo.id;
    return {
      startReached: !!(
        state.messageStore.threads[threadID] &&
        state.messageStore.threads[threadID].startReached
      ),
      styles: stylesSelector(state),
    };
  },
  { fetchMessagesBeforeCursor, fetchMostRecentMessages },
)(withKeyboardState(withOverlayContext(MessageList)));
