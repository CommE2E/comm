// @flow

import classNames from 'classnames';
import { detect as detectBrowser } from 'detect-browser';
import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import {
  fetchMessagesBeforeCursorActionTypes,
  fetchMessagesBeforeCursor,
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
} from 'lib/actions/message-actions.js';
import { useOldestMessageServerID } from 'lib/hooks/message-hooks.js';
import { registerFetchKey } from 'lib/reducers/loading-reducer.js';
import {
  type ChatMessageItem,
  useMessageListData,
} from 'lib/selectors/chat-selectors.js';
import { messageKey } from 'lib/shared/message-utils.js';
import {
  threadIsPending,
  useThreadChatMentionCandidates,
} from 'lib/shared/thread-utils.js';
import type { FetchMessageInfosPayload } from 'lib/types/message-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { editBoxHeight, defaultMaxTextAreaHeight } from './chat-constants.js';
import css from './chat-message-list.css';
import type { ScrollToMessageCallback } from './edit-message-provider.js';
import { useEditModalContext } from './edit-message-provider.js';
import { MessageListContext } from './message-list-types.js';
import Message from './message.react.js';
import RelationshipPrompt from './relationship-prompt/relationship-prompt.js';
import { useTooltipContext } from './tooltip-provider.js';
import { type InputState, InputStateContext } from '../input/input-state.js';
import LoadingIndicator from '../loading-indicator.react.js';
import { useTextMessageRulesFunc } from '../markdown/rules.react.js';
import { useSelector } from '../redux/redux-utils.js';

const browser = detectBrowser();
const supportsReverseFlex =
  !browser || browser.name !== 'firefox' || parseInt(browser.version) >= 81;

// Margin between the top of the maximum height edit box
// and the top of the container
const editBoxTopMargin = 10;

type BaseProps = {
  +threadInfo: ThreadInfo,
};

type Props = {
  ...BaseProps,
  +activeChatThreadID: ?string,
  +messageListData: ?$ReadOnlyArray<ChatMessageItem>,
  +startReached: boolean,
  +dispatchActionPromise: DispatchActionPromise,
  +fetchMessagesBeforeCursor: (
    threadID: string,
    beforeMessageID: string,
  ) => Promise<FetchMessageInfosPayload>,
  +fetchMostRecentMessages: (
    threadID: string,
  ) => Promise<FetchMessageInfosPayload>,
  +inputState: ?InputState,
  +clearTooltip: () => mixed,
  +oldestMessageServerID: ?string,
  +isEditState: boolean,
  +addScrollToMessageListener: ScrollToMessageCallback => mixed,
  +removeScrollToMessageListener: ScrollToMessageCallback => mixed,
};
type Snapshot = {
  +scrollTop: number,
  +scrollHeight: number,
};

type State = {
  +scrollingEndCallback: ?() => mixed,
};

class ChatMessageList extends React.PureComponent<Props, State> {
  container: ?HTMLDivElement;
  messageContainer: ?HTMLDivElement;
  loadingFromScroll = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      scrollingEndCallback: null,
    };
  }

  componentDidMount() {
    this.scrollToBottom();
    this.props.addScrollToMessageListener(this.scrollToMessage);
  }

  componentWillUnmount() {
    this.props.removeScrollToMessageListener(this.scrollToMessage);
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

  componentDidUpdate(prevProps: Props, prevState, snapshot: ?Snapshot) {
    const { messageListData } = this.props;
    const prevMessageListData = prevProps.messageListData;

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
      (hasNewMessage &&
        snapshot &&
        Math.abs(snapshot.scrollTop) <= 1 &&
        !this.props.isEditState)
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
        if (supportsReverseFlex) {
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

  renderItem = item => {
    if (item.itemType === 'loader') {
      return (
        <div key="loader" className={css.loading}>
          <LoadingIndicator status="loading" size="large" color="white" />
        </div>
      );
    }
    const { threadInfo } = this.props;
    invariant(threadInfo, 'ThreadInfo should be set if messageListData is');
    return (
      <Message
        item={item}
        threadInfo={threadInfo}
        shouldDisplayPinIndicator={true}
        key={ChatMessageList.keyExtractor(item)}
      />
    );
  };

  scrollingEndCallbackWrapper = (
    composedMessageID: string,
    callback: (maxHeight: number) => mixed,
  ): (() => mixed) => {
    return () => {
      const maxHeight = this.getMaxEditTextAreaHeight(composedMessageID);
      callback(maxHeight);
    };
  };

  scrollToMessage = (
    composedMessageID: string,
    callback: (maxHeight: number) => mixed,
  ) => {
    const element = document.getElementById(composedMessageID);
    if (!element) {
      return;
    }
    const scrollingEndCallback = this.scrollingEndCallbackWrapper(
      composedMessageID,
      callback,
    );
    if (!this.willMessageEditWindowOverflow(composedMessageID)) {
      scrollingEndCallback();
      return;
    }
    this.setState(
      {
        scrollingEndCallback,
      },
      () => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // It covers the case when browser decide not to scroll to the message
        // because it's already in the view.
        // In this case, the 'scroll' event won't be triggered,
        // so we need to call the callback manually.
        this.debounceEditModeAfterScrollToMessage();
      },
    );
  };

  getMaxEditTextAreaHeight = (composedMessageID: string): number => {
    const { messageContainer } = this;
    if (!messageContainer) {
      return defaultMaxTextAreaHeight;
    }
    const messageElement = document.getElementById(composedMessageID);
    if (!messageElement) {
      console.log(`couldn't find the message element`);
      return defaultMaxTextAreaHeight;
    }

    const msgPos = messageElement.getBoundingClientRect();
    const containerPos = messageContainer.getBoundingClientRect();

    const messageBottom = msgPos.bottom;
    const containerTop = containerPos.top;

    const maxHeight =
      messageBottom - containerTop - editBoxHeight - editBoxTopMargin;

    return maxHeight;
  };

  willMessageEditWindowOverflow(composedMessageID: string) {
    const { messageContainer } = this;
    if (!messageContainer) {
      return false;
    }
    const messageElement = document.getElementById(composedMessageID);
    if (!messageElement) {
      console.log(`couldn't find the message element`);
      return false;
    }

    const msgPos = messageElement.getBoundingClientRect();
    const containerPos = messageContainer.getBoundingClientRect();
    const containerTop = containerPos.top;
    const containerBottom = containerPos.bottom;

    const availableTextAreaHeight =
      (containerBottom - containerTop) / 2 - editBoxHeight;
    const messageHeight = msgPos.height;
    const expectedMinimumHeight = Math.min(
      defaultMaxTextAreaHeight,
      availableTextAreaHeight,
    );
    const offset = Math.max(
      0,
      expectedMinimumHeight + editBoxHeight + editBoxTopMargin - messageHeight,
    );

    const messageTop = msgPos.top - offset;
    const messageBottom = msgPos.bottom;

    return messageBottom > containerBottom || messageTop < containerTop;
  }

  render() {
    const { messageListData, threadInfo, inputState, isEditState } = this.props;
    if (!messageListData) {
      return <div className={css.container} />;
    }
    invariant(inputState, 'InputState should be set');
    const messages = messageListData.map(this.renderItem);

    let relationshipPrompt = null;
    if (threadInfo.type === threadTypes.PERSONAL) {
      relationshipPrompt = <RelationshipPrompt threadInfo={threadInfo} />;
    }

    const messageContainerStyle = classNames({
      [css.disableAnchor]:
        this.state.scrollingEndCallback !== null || isEditState,
      [css.messageContainer]: true,
      [css.mirroredMessageContainer]: !supportsReverseFlex,
    });
    return (
      <div className={css.outerMessageContainer}>
        {relationshipPrompt}
        <div className={messageContainerStyle} ref={this.messageContainerRef}>
          {messages}
        </div>
      </div>
    );
  }

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
    this.props.clearTooltip();
    this.possiblyLoadMoreMessages();
    this.debounceEditModeAfterScrollToMessage();
  };

  debounceEditModeAfterScrollToMessage = _debounce(() => {
    if (this.state.scrollingEndCallback) {
      this.state.scrollingEndCallback();
    }
    this.setState({ scrollingEndCallback: null });
  }, 100);

  async possiblyLoadMoreMessages() {
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

    if (this.loadingFromScroll) {
      return;
    }
    this.loadingFromScroll = true;

    const threadID = this.props.activeChatThreadID;
    invariant(threadID, 'should be set');

    try {
      const { oldestMessageServerID } = this.props;
      if (oldestMessageServerID) {
        await this.props.dispatchActionPromise(
          fetchMessagesBeforeCursorActionTypes,
          this.props.fetchMessagesBeforeCursor(threadID, oldestMessageServerID),
        );
      } else {
        await this.props.dispatchActionPromise(
          fetchMostRecentMessagesActionTypes,
          this.props.fetchMostRecentMessages(threadID),
        );
      }
    } finally {
      this.loadingFromScroll = false;
    }
  }
}

registerFetchKey(fetchMessagesBeforeCursorActionTypes);
registerFetchKey(fetchMostRecentMessagesActionTypes);
const ConnectedChatMessageList: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedChatMessageList(
    props: BaseProps,
  ): React.Node {
    const { threadInfo } = props;
    const messageListData = useMessageListData({
      threadInfo,
      searching: false,
      userInfoInputArray: [],
    });

    const startReached = !!useSelector(state => {
      const activeID = threadInfo.id;
      if (!activeID) {
        return null;
      }

      if (threadIsPending(activeID)) {
        return true;
      }

      const threadMessageInfo = state.messageStore.threads[activeID];
      if (!threadMessageInfo) {
        return null;
      }
      return threadMessageInfo.startReached;
    });

    const dispatchActionPromise = useDispatchActionPromise();
    const callFetchMessagesBeforeCursor = useServerCall(
      fetchMessagesBeforeCursor,
    );
    const callFetchMostRecentMessages = useServerCall(fetchMostRecentMessages);

    const inputState = React.useContext(InputStateContext);

    const { clearTooltip } = useTooltipContext();

    const chatMentionCandidates = useThreadChatMentionCandidates(threadInfo);
    const getTextMessageMarkdownRules = useTextMessageRulesFunc(
      threadInfo,
      chatMentionCandidates,
    );
    const messageListContext = React.useMemo(() => {
      if (!getTextMessageMarkdownRules) {
        return undefined;
      }
      return { getTextMessageMarkdownRules };
    }, [getTextMessageMarkdownRules]);

    const oldestMessageServerID = useOldestMessageServerID(threadInfo.id);

    const {
      editState,
      addScrollToMessageListener,
      removeScrollToMessageListener,
    } = useEditModalContext();
    const isEditState = editState !== null;

    return (
      <MessageListContext.Provider value={messageListContext}>
        <ChatMessageList
          activeChatThreadID={threadInfo.id}
          threadInfo={threadInfo}
          messageListData={messageListData}
          startReached={startReached}
          inputState={inputState}
          dispatchActionPromise={dispatchActionPromise}
          fetchMessagesBeforeCursor={callFetchMessagesBeforeCursor}
          fetchMostRecentMessages={callFetchMostRecentMessages}
          clearTooltip={clearTooltip}
          oldestMessageServerID={oldestMessageServerID}
          isEditState={isEditState}
          addScrollToMessageListener={addScrollToMessageListener}
          removeScrollToMessageListener={removeScrollToMessageListener}
        />
      </MessageListContext.Provider>
    );
  });

export default ConnectedChatMessageList;
