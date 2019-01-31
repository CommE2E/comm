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
import Message, { type MessagePositionInfo } from './message.react';
import LoadingIndicator from '../loading-indicator.react';
import css from './chat-message-list.css';

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
  messageMouseover: ?MessagePositionInfo,
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

  componentDidUpdate(prevProps: Props) {
    if (this.props.activeChatThreadID !== prevProps.activeChatThreadID) {
      this.scrollToBottom();
    }
    if (
      this.loadingFromScroll &&
      this.props.messageListData &&
      (
        !prevProps.messageListData ||
        this.props.messageListData.length > prevProps.messageListData.length ||
        this.props.startReached
      )
    ) {
      this.loadingFromScroll = false;
    }
    if (
      this.messageContainer &&
      prevProps.messageListData !== this.props.messageListData
    ) {
      this.onScroll();
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
        onMouseOver={this.showTimestamp}
        chatInputState={chatInputState}
        key={ChatMessageList.keyExtractor(item)}
      />
    );
  }

  showTimestamp = (messagePositionInfo: MessagePositionInfo) => {
    if (!this.messageContainer) {
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
    return connectDropTarget(
      <div className={containerStyle} ref={this.containerRef}>
        <div className={css.messageContainer} ref={this.messageContainerRef}>
          {messages}
        </div>
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
    } else if (this.container && this.container !== container) {
      this.container.removeEventListener('paste', this.onPaste);
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
