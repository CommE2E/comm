// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { onlyEmojiRegex } from 'lib/shared/emojis';
import { colorIsDark, threadHasPermission } from 'lib/shared/thread-utils';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadPermissions } from 'lib/types/thread-types';

import Markdown from '../markdown/markdown.react';
import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react';
import { MessageListContext } from './message-list-types';
import type {
  MessagePositionInfo,
  OnMessagePositionWithContainerInfo,
} from './position-types';
import textMessageSendFailed from './text-message-send-failed';

type Props = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +mouseOverMessagePosition: ?OnMessagePositionWithContainerInfo,
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
  const canReply = threadHasPermission(
    props.threadInfo,
    threadPermissions.VOICED,
  );
  return (
    <ComposedMessage
      item={props.item}
      threadInfo={props.threadInfo}
      sendFailed={textMessageSendFailed(props.item)}
      setMouseOverMessagePosition={props.setMouseOverMessagePosition}
      mouseOverMessagePosition={props.mouseOverMessagePosition}
      canReply={canReply}
    >
      <div className={messageClassName} style={messageStyle}>
        <Markdown threadColor={props.threadInfo.color} rules={rules}>
          {text}
        </Markdown>
      </div>
    </ComposedMessage>
  );
}

export default TextMessage;
