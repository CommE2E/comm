// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { onlyEmojiRegex } from 'lib/shared/emojis';
import { colorIsDark } from 'lib/shared/thread-utils';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import Markdown from '../markdown/markdown.react';
import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react';
import { MessageListContext } from './message-list-types';
import textMessageSendFailed from './text-message-send-failed';

type Props = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
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
      sendFailed={textMessageSendFailed(props.item)}
    >
      <div className={messageClassName} style={messageStyle}>
        <Markdown rules={rules}>{text}</Markdown>
      </div>
    </ComposedMessage>
  );
}

export default TextMessage;
