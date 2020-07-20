// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { MessagePositionInfo } from './message.react';

import * as React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import { colorIsDark } from 'lib/shared/thread-utils';
import { onlyEmojiRegex } from 'lib/shared/emojis';

import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react';
import textMessageSendFailed from './text-message-send-failed';
import Markdown from '../markdown/markdown.react';
import { markdownRules } from '../markdown/rules.react';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  setMouseOver: (messagePositionInfo: MessagePositionInfo) => void,
|};
class TextMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    setMouseOver: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type === messageTypes.TEXT,
      'TextMessage should only be used for messageTypes.TEXT',
    );
  }

  componentDidUpdate() {
    invariant(
      this.props.item.messageInfo.type === messageTypes.TEXT,
      'TextMessage should only be used for messageTypes.TEXT',
    );
  }

  render() {
    invariant(
      this.props.item.messageInfo.type === messageTypes.TEXT,
      'TextMessage should only be used for messageTypes.TEXT',
    );
    const {
      text,
      creator: { isViewer },
    } = this.props.item.messageInfo;

    const messageStyle = {};
    let darkColor = false;
    if (isViewer) {
      const threadColor = this.props.threadInfo.color;
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

    return (
      <ComposedMessage
        item={this.props.item}
        threadInfo={this.props.threadInfo}
        sendFailed={textMessageSendFailed(this.props.item)}
        setMouseOver={this.props.setMouseOver}
      >
        <div className={messageClassName} style={messageStyle}>
          <Markdown useDarkStyle={darkColor} rules={markdownRules}>
            {text}
          </Markdown>
        </div>
      </ComposedMessage>
    );
  }
}

export default TextMessage;
