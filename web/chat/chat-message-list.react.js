// @flow

import type { AppState } from '../redux-setup';
import {
  type ChatMessageItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { FetchMessageInfosPayload } from 'lib/types/message-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { connect } from 'lib/utils/redux-utils';
import { messageKey } from 'lib/shared/message-utils';
import { viewerCanSeeThread } from 'lib/shared/thread-utils';
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
import Message from './message.react';
import LoadingIndicator from '../loading-indicator.react';
import css from './chat-message-list.css';

type Props = {|
  // Redux state
  activeChatThreadID: ?string,
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
class ChatMessageList extends React.PureComponent<Props> {

  static propTypes = {
    activeChatThreadID: PropTypes.string,
    threadInfo: threadInfoPropType,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType),
    startReached: PropTypes.bool.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    fetchMessagesBeforeCursor: PropTypes.func.isRequired,
    fetchMostRecentMessages: PropTypes.func.isRequired,
  };
  messageContainer: ?HTMLDivElement = null;
  loadingFromScroll = false;

  componentDidMount() {
    const { threadInfo } = this.props;
    if (!threadInfo || viewerCanSeeThread(threadInfo)) {
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
    if (!threadInfo || viewerCanSeeThread(threadInfo)) {
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
  }

  scrollToBottom() {
    invariant(this.messageContainer, "should be set");
    this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
  }

  static keyExtractor(item: ChatMessageItem) {
    if (item.itemType === "loader") {
      return "loader";
    }
    return messageKey(item.messageInfo);
  }

  static renderItem(item) {
    if (item.itemType === "loader") {
      return (
        <div key="loader" className={css.loading}>
          <LoadingIndicator status="loading" size="large" color="black" />
        </div>
      );
    }
    return <Message item={item} key={ChatMessageList.keyExtractor(item)} />;
  }

  render() {
    if (!this.props.messageListData) {
      return <div className={css.container} />;
    }
    const messages = this.props.messageListData.map(
      ChatMessageList.renderItem,
    );
    return (
      <div className={css.container}>
        <div className={css.messageContainer} ref={this.messageContainerRef}>
          {messages}
        </div>
        <ChatInputBar />
      </div>
    );
  }

  messageContainerRef = (messageContainer: ?HTMLDivElement) => {
    this.messageContainer = messageContainer;
    if (messageContainer) {
      messageContainer.addEventListener("scroll", this.onScroll);
    }
  }

  onScroll = () => {
    invariant(this.messageContainer, "should be set");
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

export default connect(
  (state: AppState) => {
    const activeChatThreadID = state.navInfo.activeChatThreadID;
    return {
      activeChatThreadID,
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
