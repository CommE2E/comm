// @flow

import classNames from 'classnames';
import { detect as detectBrowser } from 'detect-browser';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import * as React from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
} from 'lib/actions/message-actions';
import { registerFetchKey } from 'lib/reducers/loading-reducer';
import {
  type ChatMessageItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { messageKey } from 'lib/shared/message-utils';
import { threadInChatList } from 'lib/shared/thread-utils';
import threadWatcher from 'lib/shared/thread-watcher';
import type { FetchMessageInfosPayload } from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import {
  inputStatePropType,
  type InputState,
  InputStateContext,
} from '../input/input-state';
import LoadingIndicator from '../loading-indicator.react';
import { useTextMessageRulesFunc } from '../markdown/rules.react';
import { useSelector } from '../redux/redux-utils';
import { webMessageListData } from '../selectors/chat-selectors';
import ChatInputBar from './chat-input-bar.react';
import css from './chat-message-list.css';
import { MessageListContext } from './message-list-types';
import type {
  OnMessagePositionInfo,
  MessagePositionInfo,
} from './message-position-types';
import MessageTimestampTooltip from './message-timestamp-tooltip.react';
import Message from './message.react';

type BaseProps = {|
  +setModal: (modal: ?React.Node) => void,
|};
type PassedProps = {|
  ...BaseProps,
  // Redux state
  +activeChatThreadID: ?string,
  +threadInfo: ?ThreadInfo,
  +messageListData: ?$ReadOnlyArray<ChatMessageItem>,
  +startReached: boolean,
  +timeZone: ?string,
  +supportsReverseFlex: boolean,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +fetchMessagesBeforeCursor: (
    threadID: string,
    beforeMessageID: string,
  ) => Promise<FetchMessageInfosPayload>,
  +fetchMostRecentMessages: (
    threadID: string,
  ) => Promise<FetchMessageInfosPayload>,
  // withInputState
  +inputState: ?InputState,
|};
type ReactDnDProps = {|
  isActive: boolean,
  connectDropTarget: (node: React.Node) => React.Node,
|};
type Props = {|
  ...PassedProps,
  ...ReactDnDProps,
|};
type State = {|
  +mouseOverMessagePosition: ?OnMessagePositionInfo,
|};
type Snapshot = {|
  +scrollTop: number,
  +scrollHeight: number,
|};
class ChatMessageList extends React.PureComponent<Props, State> {
  static propTypes = {
    setModal: PropTypes.func.isRequired,
    activeChatThreadID: PropTypes.string,
    threadInfo: threadInfoPropType,
    messageListData: PropTypes.arrayOf(chatMessageItemPropType),
    startReached: PropTypes.bool.isRequired,
    timeZone: PropTypes.string,
    supportsReverseFlex: PropTypes.bool.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    fetchMessagesBeforeCursor: PropTypes.func.isRequired,
    fetchMostRecentMessages: PropTypes.func.isRequired,
    inputState: inputStatePropType,
  };
  state: State = {
    mouseOverMessagePosition: null,
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
    this.scrollToBottom();
  }

  componentWillUnmount() {
    const { threadInfo } = this.props;
    if (!threadInfo || threadInChatList(threadInfo)) {
      return;
    }
    threadWatcher.removeID(threadInfo.id);
  }

  getSnapshotBeforeUpdate(prevProps: Props) {
    if (
      ChatMessageList.hasNewMessage(this.props, prevProps) &&
      this.messageContainer
    ) {
      const { scrollTop, scrollHeight } = this.messageContainer;
      return { scrollTop, scrollHeight };
    }
    return null;
  }

  static hasNewMessage(props: Props, prevProps: Props) {
    const { messageListData } = props;
    if (!messageListData || messageListData.length === 0) {
      return false;
    }
    const prevMessageListData = prevProps.messageListData;
    if (!prevMessageListData || prevMessageListData.length === 0) {
      return true;
    }
    return (
      ChatMessageList.keyExtractor(prevMessageListData[0]) !==
      ChatMessageList.keyExtractor(messageListData[0])
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State, snapshot: ?Snapshot) {
    const { messageListData } = this.props;
    const prevMessageListData = prevProps.messageListData;

    if (
      this.loadingFromScroll &&
      messageListData &&
      (!prevMessageListData ||
        messageListData.length > prevMessageListData.length ||
        this.props.startReached)
    ) {
      this.loadingFromScroll = false;
    }

    const { messageContainer } = this;
    if (messageContainer && prevMessageListData !== messageListData) {
      this.onScroll();
    }

    // We'll scroll to the bottom if the user was already scrolled to the bottom
    // before the new message, or if the new message was composed locally
    const hasNewMessage = ChatMessageList.hasNewMessage(this.props, prevProps);
    if (
      this.props.activeChatThreadID !== prevProps.activeChatThreadID ||
      (hasNewMessage &&
        messageListData &&
        messageListData[0].itemType === 'message' &&
        messageListData[0].messageInfo.localID) ||
      (hasNewMessage && snapshot && Math.abs(snapshot.scrollTop) <= 1)
    ) {
      this.scrollToBottom();
    } else if (hasNewMessage && messageContainer && snapshot) {
      const { scrollTop, scrollHeight } = messageContainer;
      if (
        scrollHeight > snapshot.scrollHeight &&
        scrollTop === snapshot.scrollTop
      ) {
        const newHeight = scrollHeight - snapshot.scrollHeight;
        const newScrollTop = Math.abs(scrollTop) + newHeight;
        if (this.props.supportsReverseFlex) {
          messageContainer.scrollTop = -1 * newScrollTop;
        } else {
          messageContainer.scrollTop = newScrollTop;
        }
      }
    }
  }

  scrollToBottom() {
    if (this.messageContainer) {
      this.messageContainer.scrollTop = 0;
    }
  }

  static keyExtractor(item: ChatMessageItem) {
    if (item.itemType === 'loader') {
      return 'loader';
    }
    return messageKey(item.messageInfo);
  }

  renderItem = (item) => {
    if (item.itemType === 'loader') {
      return (
        <div key="loader" className={css.loading}>
          <LoadingIndicator status="loading" size="large" color="black" />
        </div>
      );
    }
    const { threadInfo, setModal } = this.props;
    invariant(threadInfo, 'ThreadInfo should be set if messageListData is');
    return (
      <Message
        item={item}
        threadInfo={threadInfo}
        setMouseOverMessagePosition={this.setMouseOverMessagePosition}
        mouseOverMessagePosition={this.state.mouseOverMessagePosition}
        setModal={setModal}
        timeZone={this.props.timeZone}
        key={ChatMessageList.keyExtractor(item)}
      />
    );
  };

  setMouseOverMessagePosition = (messagePositionInfo: MessagePositionInfo) => {
    if (!this.messageContainer) {
      return;
    }
    if (messagePositionInfo.type === 'off') {
      this.setState({ mouseOverMessagePosition: null });
      return;
    }
    const containerTop = this.messageContainer.getBoundingClientRect().top;
    const mouseOverMessagePosition = {
      ...messagePositionInfo,
      messagePosition: {
        ...messagePositionInfo.messagePosition,
        top: messagePositionInfo.messagePosition.top - containerTop,
        bottom: messagePositionInfo.messagePosition.bottom - containerTop,
      },
    };
    this.setState({ mouseOverMessagePosition });
  };

  render() {
    const {
      messageListData,
      threadInfo,
      inputState,
      connectDropTarget,
      isActive,
    } = this.props;
    if (!messageListData) {
      return <div className={css.container} />;
    }
    invariant(threadInfo, 'ThreadInfo should be set if messageListData is');
    invariant(inputState, 'InputState should be set');
    const messages = messageListData.map(this.renderItem);
    const containerStyle = classNames({
      [css.container]: true,
      [css.activeContainer]: isActive,
    });

    const tooltip = (
      <MessageTimestampTooltip
        messagePositionInfo={this.state.mouseOverMessagePosition}
        timeZone={this.props.timeZone}
      />
    );

    const messageContainerStyle = classNames({
      [css.messageContainer]: true,
      [css.mirroredMessageContainer]: !this.props.supportsReverseFlex,
    });
    return connectDropTarget(
      <div className={containerStyle} ref={this.containerRef}>
        <div className={messageContainerStyle} ref={this.messageContainerRef}>
          {messages}
          {tooltip}
        </div>
        <ChatInputBar threadInfo={threadInfo} inputState={inputState} />
      </div>,
    );
  }

  containerRef = (container: ?HTMLDivElement) => {
    if (container) {
      container.addEventListener('paste', this.onPaste);
    }
    this.container = container;
  };

  onPaste = (e: ClipboardEvent) => {
    const { inputState } = this.props;
    if (!inputState) {
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
    inputState.appendFiles([...files]);
  };

  messageContainerRef = (messageContainer: ?HTMLDivElement) => {
    this.messageContainer = messageContainer;
    // In case we already have all the most recent messages,
    // but they're not enough
    this.possiblyLoadMoreMessages();
    if (messageContainer) {
      messageContainer.addEventListener('scroll', this.onScroll);
    }
  };

  onScroll = () => {
    if (!this.messageContainer) {
      return;
    }
    if (this.state.mouseOverMessagePosition) {
      this.setState({ mouseOverMessagePosition: null });
    }
    this.possiblyLoadMoreMessages();
  };

  possiblyLoadMoreMessages() {
    if (!this.messageContainer) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = this.messageContainer;
    if (
      this.props.startReached ||
      Math.abs(scrollTop) + clientHeight + 55 < scrollHeight
    ) {
      return;
    }
    const oldestMessageServerID = this.oldestMessageServerID();
    if (!oldestMessageServerID) {
      return;
    }
    const threadID = this.props.activeChatThreadID;
    invariant(threadID, 'should be set');
    this.loadingFromScroll = true;
    this.props.dispatchActionPromise(
      fetchMessagesBeforeCursorActionTypes,
      this.props.fetchMessagesBeforeCursor(threadID, oldestMessageServerID),
    );
  }

  oldestMessageServerID(): ?string {
    const data = this.props.messageListData;
    invariant(data, 'should be set');
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].itemType === 'message' && data[i].messageInfo.id) {
        return data[i].messageInfo.id;
      }
    }
    return null;
  }
}

registerFetchKey(fetchMessagesBeforeCursorActionTypes);
registerFetchKey(fetchMostRecentMessagesActionTypes);

export default React.memo<BaseProps>(function ConnectedChatMessageList(
  props: BaseProps,
) {
  const userAgent = useSelector((state) => state.userAgent);
  const supportsReverseFlex = React.useMemo(() => {
    const browser = detectBrowser(userAgent);
    return (
      !browser || browser.name !== 'firefox' || parseInt(browser.version) >= 81
    );
  }, [userAgent]);

  const messageListData = useSelector(webMessageListData);
  const timeZone = useSelector((state) => state.timeZone);

  const activeChatThreadID = useSelector(
    (state) => state.navInfo.activeChatThreadID,
  );
  const threadInfo = useSelector((state) => {
    const activeID = state.navInfo.activeChatThreadID;
    if (!activeID) {
      return null;
    }
    return threadInfoSelector(state)[activeID];
  });
  const startReached = useSelector((state) => {
    const activeID = state.navInfo.activeChatThreadID;
    if (!activeID) {
      return null;
    }
    return state.messageStore.threads[activeID].startReached;
  });

  const dispatchActionPromise = useDispatchActionPromise();
  const callFetchMessagesBeforeCursor = useServerCall(
    fetchMessagesBeforeCursor,
  );
  const callFetchMostRecentMessages = useServerCall(fetchMostRecentMessages);

  const inputState = React.useContext(InputStateContext);
  const [dndProps, connectDropTarget] = useDrop({
    accept: NativeTypes.FILE,
    drop: (item) => {
      const { files } = item;
      if (inputState && files.length > 0) {
        inputState.appendFiles(files);
      }
    },
    collect: (monitor) => ({
      isActive: monitor.isOver() && monitor.canDrop(),
    }),
  });

  const getTextMessageMarkdownRules = useTextMessageRulesFunc(threadInfo?.id);
  const messageListContext = React.useMemo(() => {
    if (!getTextMessageMarkdownRules) {
      return undefined;
    }
    return { getTextMessageMarkdownRules };
  }, [getTextMessageMarkdownRules]);

  return (
    <MessageListContext.Provider value={messageListContext}>
      <ChatMessageList
        {...props}
        activeChatThreadID={activeChatThreadID}
        threadInfo={threadInfo}
        messageListData={messageListData}
        startReached={startReached}
        timeZone={timeZone}
        supportsReverseFlex={supportsReverseFlex}
        inputState={inputState}
        dispatchActionPromise={dispatchActionPromise}
        fetchMessagesBeforeCursor={callFetchMessagesBeforeCursor}
        fetchMostRecentMessages={callFetchMostRecentMessages}
        {...dndProps}
        connectDropTarget={connectDropTarget}
      />
    </MessageListContext.Provider>
  );
});
