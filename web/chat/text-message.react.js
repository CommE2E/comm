// @flow

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import type {
  MessagePositionInfo,
  OnMessagePositionInfo,
} from './message-position-types';

import * as React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { colorIsDark } from 'lib/shared/thread-utils';
import { onlyEmojiRegex } from 'lib/shared/emojis';
import { relativeMemberInfoSelectorForMembersOfThread } from 'lib/selectors/user-selectors';

import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react';
import textMessageSendFailed from './text-message-send-failed';
import Markdown from '../markdown/markdown.react';
import { textMessageRules } from '../markdown/rules.react';

type Props = {|
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +mouseOverMessagePosition: ?OnMessagePositionInfo,
|};
function TextMessage(props: Props) {
  invariant(
    props.item.messageInfo.type === messageTypes.TEXT,
    'TextMessage should only be used for messageTypes.TEXT',
  );
  const {
    text,
    creator: { isViewer },
  } = props.item.messageInfo;

  const messageStyle = {};
  let darkColor = false;
  if (isViewer) {
    const threadColor = props.threadInfo.color;
    darkColor = colorIsDark(threadColor);
    messageStyle.backgroundColor = `#${threadColor}`;
  } else {
    messageStyle.backgroundColor = 'rgba(221,221,221,0.73)';
  }

  const onlyEmoji = onlyEmojiRegex.test(text);
  const messageClassName = classNames({
    [css.textMessage]: true,
    [css.normalTextMessage]: !onlyEmoji,
    [css.emojiOnlyTextMessage]: onlyEmoji,
    [css.darkTextMessage]: darkColor,
    [css.lightTextMessage]: !darkColor,
  });

  const threadID = props.threadInfo.id;
  const threadMembers = useSelector(state =>
    relativeMemberInfoSelectorForMembersOfThread(threadID)(state),
  );

  return (
    <ComposedMessage
      item={props.item}
      threadInfo={props.threadInfo}
      sendFailed={textMessageSendFailed(props.item)}
      setMouseOverMessagePosition={props.setMouseOverMessagePosition}
      mouseOverMessagePosition={props.mouseOverMessagePosition}
      canReply={true}
    >
      <div className={messageClassName} style={messageStyle}>
        <Markdown rules={textMessageRules(darkColor, threadMembers)}>
          {text}
        </Markdown>
      </div>
    </ComposedMessage>
  );
}

export default TextMessage;
