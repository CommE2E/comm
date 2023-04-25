// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { colorIsDark } from 'lib/shared/color-utils.js';
import { onlyEmojiRegex } from 'lib/shared/emojis.js';
import { messageTypes } from 'lib/types/message-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';

import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react.js';
import { MessageListContext } from './message-list-types.js';
import textMessageSendFailed from './text-message-send-failed.js';
import Markdown from '../markdown/markdown.react.js';

type Props = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +shouldDisplayPinIndicator: boolean,
};
function TextMessage(props: Props): React.Node {
  invariant(
    props.item.messageInfo.type === messageTypes.TEXT,
    'TextMessage should only be used for messageTypes.TEXT',
  );
  const {
    text,
    creator: { isViewer },
  } = props.item.messageInfo;

  const messageStyle = {};
  let darkColor = true;
  if (isViewer) {
    const threadColor = props.threadInfo.color;
    darkColor = colorIsDark(threadColor);
    messageStyle.backgroundColor = `#${threadColor}`;
  }

  const onlyEmoji = onlyEmojiRegex.test(text);
  const messageClassName = classNames({
    [css.textMessage]: true,
    [css.textMessageDefaultBackground]: !isViewer,
    [css.normalTextMessage]: !onlyEmoji,
    [css.emojiOnlyTextMessage]: onlyEmoji,
    [css.darkTextMessage]: darkColor,
    [css.lightTextMessage]: !darkColor,
  });

  const messageListContext = React.useContext(MessageListContext);
  invariant(messageListContext, 'DummyTextNode should have MessageListContext');
  const rules = messageListContext.getTextMessageMarkdownRules(darkColor);
  return (
    <ComposedMessage
      item={props.item}
      threadInfo={props.threadInfo}
      shouldDisplayPinIndicator={props.shouldDisplayPinIndicator}
      sendFailed={textMessageSendFailed(props.item)}
    >
      <div className={messageClassName} style={messageStyle}>
        <Markdown rules={rules}>{text}</Markdown>
      </div>
    </ComposedMessage>
  );
}

export default TextMessage;
