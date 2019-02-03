// @flow

import type { AppState } from '../redux-setup';
import {
  type ChatMessageItem,
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { FetchMessageInfosPayload } from 'lib/types/message-types';
import {
  chatInputStatePropType,
  type ChatInputState,
} from './chat-input-state';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import {
  DropTarget,
  DropTargetMonitor,
  ConnectDropTarget,
  DropTargetConnector,
} from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import classNames from 'classnames';
import { detect as detectBrowser } from 'detect-browser';

import { connect } from 'lib/utils/redux-utils';
import { messageKey } from 'lib/shared/message-utils';
import { threadInChatList } from 'lib/shared/thread-utils';
import threadWatcher from 'lib/shared/thread-watcher';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
} from 'lib/actions/message-actions';
import { registerFetchKey } from 'lib/reducers/loading-reducer';

import { webMessageListData } from '../selectors/chat-selectors';
import ChatInputBar from './chat-input-bar.react';
import Message, {
  type MessagePositionInfo,
  type OnMessagePositionInfo,
} from './message.react';
import LoadingIndicator from '../loading-indicator.react';
import MessageTimestampTooltip from './message-timestamp-tooltip.react';
import css from './chat-message-list.css';

const browser = detectBrowser();
const usingFlexDirectionColumnReverse = browser && browser.name === "chrome";

type PassedProps = {|
  activeChatThreadID: ?string,
  chatInputState: ?ChatInputState,
  // Redux state
  threadInfo: ?ThreadInfo,
  messageListData: ?$ReadOnlyArray<ChatMessageItem>,
  startReached: bool,
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
type ReactDnDProps = {|
  isActive: bool,
  connectDropTarget: ConnectDropTarget,
|};
type Props = {|
  ...PassedProps,
  ...ReactDnDProps,
|};
type State = {|
  messageMouseover: ?OnMessagePositionInfo,
|};
class ChatMessageList extends React.PureComponent<Props, State> {

  static propTypes = {
    activeChatThreadID: PropTypes.string,
    chatInputState: chatInputStatePropType,
    threadInfo: threadInfoPropType,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType),
    startReached: PropTypes.bool.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    fetchMessagesBeforeCursor: PropTypes.func.isRequired,
    fetchMostRecentMessages: PropTypes.func.isRequired,
  };
  state = {
    messageMouseover: null,
  };
  container: ?HTMLDivElement;
  messageContainer: ?HTMLDivElement;
  loadingFromScroll = false;

  componentDidMount() {
    const { threadInfo } = this.props;
    if (!threadInfo || threadInChatList(threadInfo)) {
      return;
    }
    threadWatcher.watchID(threadInfo.id);
    this.props.dispatchActionPromise(
      fetchMostRecentMessagesActionTypes,
      this.props.fetchMostRecentMessages(threadInfo.id),
    );
  }

  componentWillUnmount() {
    const { threadInfo } = this.props;
    if (!threadInfo || threadInChatList(threadInfo)) {
      return;
    }
    threadWatcher.removeID(threadInfo.id);
  }

  getSnapshotBeforeUpdate(prevProps: Props): ?number {
    if (usingFlexDirectionColumnReverse) {
      return null;
    }

    const { messageListData } = this.props;
    const prevMessageListData = prevProps.messageListData;
    const { messageContainer } = this;
    if (
      !messageListData ||
      !prevMessageListData ||
      !messageContainer ||
      messageListData.length <= prevMessageListData.length
    ) {
      return null;
    }

    // We only get here if new messages are being added. If they are being
    // appended, ie. the user scrolled up to load older messages, we should
    // always increase scroll position to compensate for the new height. On the
    // other hand, if they are being prepended because they are new messages,
    // we should only increase the scroll position if we were already scrolled
    // to the newest message.
    if (
      prevMessageListData.length > 0 &&
      ChatMessageList.keyExtractor(messageListData[0]) !==
        ChatMessageList.keyExtractor(prevMessageListData[0]) &&
      messageContainer.scrollTop !==
        (messageContainer.scrollHeight - messageContainer.offsetHeight)
    ) {
      return null;
    }

    return messageContainer.scrollHeight;
  }

  componentDidUpdate(prevProps: Props, prevState: State, snapshot: ?number) {
    const { messageListData } = this.props;
    const prevMessageListData = prevProps.messageListData;

    if (
      this.loadingFromScroll &&
      messageListData &&
      (
        !prevMessageListData ||
        messageListData.length > prevMessageListData.length ||
        this.props.startReached
      )
    ) {
      this.loadingFromScroll = false;
    }

    const { messageContainer } = this;
    if (
      messageContainer &&
      prevProps.messageListData !== this.props.messageListData
    ) {
      this.onScroll();
    }

    if (
      this.props.activeChatThreadID !== prevProps.activeChatThreadID ||
      (
        // This conditional evaluates to true when this client is the case of
        // a new message being prepended to the messageListData
        messageListData &&
        messageListData.length > 0 &&
        (!prevMessageListData ||
          prevMessageListData.length === 0 ||
          ChatMessageList.keyExtractor(prevMessageListData[0]) !==
            ChatMessageList.keyExtractor(messageListData[0])) &&
        messageListData[0].itemType === "message" &&
        messageListData[0].messageInfo.localID
      )
    ) {
      this.scrollToBottom();
    } else if (
      snapshot !== null &&
      snapshot !== undefined &&
      messageContainer
    ) {
      messageContainer.scrollTop += messageContainer.scrollHeight - snapshot;
    }
  }

  scrollToBottom() {
    if (this.messageContainer) {
      this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }
  }

  static keyExtractor(item: ChatMessageItem) {
    if (item.itemType === "loader") {
      return "loader";
    }
    return messageKey(item.messageInfo);
  }

  renderItem = (item) => {
    if (item.itemType === "loader") {
      return (
        <div key="loader" className={css.loading}>
          <LoadingIndicator status="loading" size="large" color="black" />
        </div>
      );
    }
    const { threadInfo, chatInputState } = this.props;
    invariant(chatInputState, "ChatInputState should be set");
    invariant(threadInfo, "ThreadInfo should be set if messageListData is");
    return (
      <Message
        item={item}
        threadInfo={threadInfo}
        setMouseOver={this.setTimestampTooltip}
        chatInputState={chatInputState}
        key={ChatMessageList.keyExtractor(item)}
      />
    );
  }

  setTimestampTooltip = (messagePositionInfo: MessagePositionInfo) => {
    if (!this.messageContainer) {
      return;
    }
    if (messagePositionInfo.type === "off") {
      if (
        this.state.messageMouseover &&
        ChatMessageList.keyExtractor(this.state.messageMouseover.item) ===
          ChatMessageList.keyExtractor(messagePositionInfo.item)
      ) {
        this.setState({ messageMouseover: null });
      }
      return;
    }
    const containerTop = this.messageContainer.getBoundingClientRect().top;
    const messageMouseover = {
      ...messagePositionInfo,
      messagePosition: {
        ...messagePositionInfo.messagePosition,
        top: messagePositionInfo.messagePosition.top - containerTop,
        bottom: messagePositionInfo.messagePosition.bottom - containerTop,
      },
    };
    this.setState({ messageMouseover });
  }

  render() {
    const {
      messageListData,
      threadInfo,
      chatInputState,
      connectDropTarget,
      isActive,
    } = this.props;
    if (!messageListData) {
      return <div className={css.container} />;
    }
    invariant(threadInfo, "ThreadInfo should be set if messageListData is");
    invariant(chatInputState, "ChatInputState should be set");
    const messages = messageListData.map(this.renderItem);
    const containerStyle = classNames({
      [css.container]: true,
      [css.activeContainer]: isActive,
    });

    const tooltip = (
      <MessageTimestampTooltip
        messagePositionInfo={this.state.messageMouseover}
      />
    );

    let content;
    if (!usingFlexDirectionColumnReverse) {
      content = (
        <div className={css.invertedMessageContainer} ref={this.messageContainerRef}>
          {[...messages].reverse()}
          {tooltip}
        </div>
      );
    } else {
      content = (
        <div className={css.messageContainer} ref={this.messageContainerRef}>
          {messages}
          {tooltip}
        </div>
      );
    }

    return connectDropTarget(
      <div className={containerStyle} ref={this.containerRef}>
        {content}
        <ChatInputBar
          threadInfo={threadInfo}
          chatInputState={chatInputState}
        />
      </div>,
    );
  }

  containerRef = (container: ?HTMLDivElement) => {
    if (container) {
      container.addEventListener('paste', this.onPaste);
    }
    this.container = container;
  }

  onPaste = (e: ClipboardEvent) => {
    const { chatInputState } = this.props;
    if (!chatInputState) {
      return;
    }
    const { clipboardData } = e;
    if (!clipboardData) {
      return;
    }
    const { files } = clipboardData;
    if (files.length === 0) {
      return;
    }
    e.preventDefault();
    chatInputState.appendFiles([...files]);
  }

  messageContainerRef = (messageContainer: ?HTMLDivElement) => {
    this.messageContainer = messageContainer;
    // In case we already have all the most recent messages,
    // but they're not enough
    this.possiblyLoadMoreMessages();
    if (messageContainer) {
      messageContainer.addEventListener("scroll", this.onScroll);
    }
  }

  onScroll = () => {
    if (!this.messageContainer) {
      return;
    }
    if (this.state.messageMouseover) {
      this.setState({ messageMouseover: null });
    }
    this.possiblyLoadMoreMessages();
  }

  possiblyLoadMoreMessages() {
    if (!this.messageContainer) {
      return;
    }
    if (this.messageContainer.scrollTop > 55 || this.props.startReached) {
      return;
    }
    const oldestMessageServerID = this.oldestMessageServerID();
    if (!oldestMessageServerID) {
      return;
    }
    const threadID = this.props.activeChatThreadID;
    invariant(threadID, "should be set");
    this.loadingFromScroll = true;
    this.props.dispatchActionPromise(
      fetchMessagesBeforeCursorActionTypes,
      this.props.fetchMessagesBeforeCursor(
        threadID,
        oldestMessageServerID,
      ),
    );
  }

  oldestMessageServerID(): ?string {
    const data = this.props.messageListData;
    invariant(data, "should be set");
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].itemType === "message" && data[i].messageInfo.id) {
        return data[i].messageInfo.id;
      }
    }
    return null;
  }

}

registerFetchKey(fetchMessagesBeforeCursorActionTypes);
registerFetchKey(fetchMostRecentMessagesActionTypes);

const ReduxConnectedChatMessageList = connect(
  (state: AppState, ownProps: { activeChatThreadID: ?string }) => {
    const { activeChatThreadID } = ownProps;
    return {
      threadInfo: activeChatThreadID
        ? threadInfoSelector(state)[activeChatThreadID]
        : null,
      messageListData: webMessageListData(state),
      startReached: !!(activeChatThreadID &&
        state.messageStore.threads[activeChatThreadID].startReached),
    };
  },
  { fetchMessagesBeforeCursor, fetchMostRecentMessages },
)(ChatMessageList);

export default DropTarget(
  NativeTypes.FILE,
  {
    drop: (props: PassedProps, monitor: DropTargetMonitor) => {
      const { files } = monitor.getItem();
      if (props.chatInputState && files.length > 0) {
        props.chatInputState.appendFiles(files);
      }
    },
  },
  (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
		connectDropTarget: connect.dropTarget(),
		isActive: monitor.isOver() && monitor.canDrop(),
	}),
)(ReduxConnectedChatMessageList);
