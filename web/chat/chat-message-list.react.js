// @flow

import classNames from 'classnames';
import { detect as detectBrowser } from 'detect-browser';
import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import { useThreadChatMentionCandidates } from 'lib/hooks/chat-mention-hooks.js';
import {
  type ChatMessageItem,
  useMessageListData,
} from 'lib/selectors/chat-selectors.js';
import { chatMessageItemKey } from 'lib/shared/chat-message-item-utils.js';
import { useFetchMessages } from 'lib/shared/message-utils.js';
import {
  threadIsPending,
  threadOtherMembers,
} from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import {
  threadTypeIsPersonal,
  threadTypeIsThick,
} from 'lib/types/thread-types-enum.js';
import sleep from 'lib/utils/sleep.js';

import { defaultMaxTextAreaHeight, editBoxHeight } from './chat-constants.js';
import css from './chat-message-list.css';
import type { ScrollToMessageCallback } from './edit-message-provider.js';
import { useEditModalContext } from './edit-message-provider.js';
import { MessageListContext } from './message-list-types.js';
import Message from './message.react.js';
import RelationshipPrompt from './relationship-prompt/relationship-prompt.js';
import { type InputState, InputStateContext } from '../input/input-state.js';
import LoadingIndicator from '../loading-indicator.react.js';
import { useTextMessageRulesFunc } from '../markdown/rules.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useTooltipContext } from '../tooltips/tooltip-provider.js';

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
  +inputState: ?InputState,
  +clearTooltip: () => mixed,
  +isEditState: boolean,
  +addScrollToMessageListener: ScrollToMessageCallback => mixed,
  +removeScrollToMessageListener: ScrollToMessageCallback => mixed,
  +viewerID: ?string,
  +fetchMessages: () => Promise<mixed>,
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

  getSnapshotBeforeUpdate(prevProps: Props): ?Snapshot {
    if (
      ChatMessageList.hasNewMessage(this.props, prevProps) &&
      this.messageContainer
    ) {
      const { scrollTop, scrollHeight } = this.messageContainer;
      return { scrollTop, scrollHeight };
    }
    return null;
  }

  static hasNewMessage(props: Props, prevProps: Props): boolean {
    const { messageListData } = props;
    if (!messageListData || messageListData.length === 0) {
      return false;
    }
    const prevMessageListData = prevProps.messageListData;
    if (!prevMessageListData || prevMessageListData.length === 0) {
      return true;
    }
    return (
      chatMessageItemKey(prevMessageListData[0]) !==
      chatMessageItemKey(messageListData[0])
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State, snapshot: ?Snapshot) {
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

  renderItem = (item: ChatMessageItem): React.Node => {
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
        key={chatMessageItemKey(item)}
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

  willMessageEditWindowOverflow(composedMessageID: string): boolean {
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

  render(): React.Node {
    const { messageListData, threadInfo, inputState, isEditState } = this.props;
    if (!messageListData) {
      return <div className={css.container} />;
    }
    invariant(inputState, 'InputState should be set');
    const messages = messageListData.map(this.renderItem);

    let relationshipPrompt = null;
    if (threadTypeIsPersonal(threadInfo.type)) {
      const otherMembers = threadOtherMembers(
        threadInfo.members,
        this.props.viewerID,
      );

      let pendingPersonalThreadUserInfo;
      if (otherMembers.length === 1) {
        const otherMember = otherMembers[0];
        pendingPersonalThreadUserInfo = {
          id: otherMember.id,
          username: otherMember.username,
        };
      }

      relationshipPrompt = (
        <RelationshipPrompt
          threadInfo={threadInfo}
          pendingPersonalThreadUserInfo={pendingPersonalThreadUserInfo}
        />
      );
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
    void this.possiblyLoadMoreMessages();
    if (messageContainer) {
      messageContainer.addEventListener('scroll', this.onScroll);
    }
  };

  onScroll = () => {
    if (!this.messageContainer) {
      return;
    }
    this.props.clearTooltip();
    void this.possiblyLoadMoreMessages();
    this.debounceEditModeAfterScrollToMessage();
  };

  debounceEditModeAfterScrollToMessage: () => void = _debounce(() => {
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

    try {
      if (threadTypeIsThick(this.props.threadInfo.type)) {
        await sleep(100);
      }
      await this.props.fetchMessages();
    } finally {
      this.loadingFromScroll = false;
    }
  }
}

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

    const fetchMessages = useFetchMessages(threadInfo);

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

    const {
      editState,
      addScrollToMessageListener,
      removeScrollToMessageListener,
    } = useEditModalContext();
    const isEditState = editState !== null;

    const viewerID = useSelector(state => state.currentUserInfo?.id);

    return (
      <MessageListContext.Provider value={messageListContext}>
        <ChatMessageList
          activeChatThreadID={threadInfo.id}
          threadInfo={threadInfo}
          messageListData={messageListData}
          startReached={startReached}
          inputState={inputState}
          clearTooltip={clearTooltip}
          isEditState={isEditState}
          addScrollToMessageListener={addScrollToMessageListener}
          removeScrollToMessageListener={removeScrollToMessageListener}
          viewerID={viewerID}
          fetchMessages={fetchMessages}
        />
      </MessageListContext.Provider>
    );
  });

export default ConnectedChatMessageList;
