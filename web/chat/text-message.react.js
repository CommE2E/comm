// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { MessagePositionInfo } from './message.react';
import { inputStatePropType, type InputState } from '../input/input-state';

import * as React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import Linkify from 'react-linkify';
import PropTypes from 'prop-types';

import { colorIsDark } from 'lib/shared/thread-utils';
import { onlyEmojiRegex } from 'lib/shared/emojis';

import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react';
import textMessageSendFailed from './text-message-send-failed';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  setMouseOver: (messagePositionInfo: MessagePositionInfo) => void,
  inputState: InputState,
|};
class TextMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    setMouseOver: PropTypes.func.isRequired,
    inputState: inputStatePropType.isRequired,
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

    const onlyEmoji = onlyEmojiRegex.test(text);
    const messageClassName = classNames({
      [css.textMessage]: true,
      [css.normalTextMessage]: !onlyEmoji,
      [css.emojiOnlyTextMessage]: onlyEmoji,
    });

    const messageStyle = {};
    if (isViewer) {
      const threadColor = this.props.threadInfo.color;
      const darkColor = colorIsDark(threadColor);
      messageStyle.backgroundColor = `#${threadColor}`;
      messageStyle.color = darkColor ? 'white' : 'black';
    } else {
      messageStyle.backgroundColor = 'rgba(221,221,221,0.73)';
      messageStyle.color = 'black';
    }

    return (
      <ComposedMessage
        item={this.props.item}
        threadInfo={this.props.threadInfo}
        sendFailed={textMessageSendFailed(this.props.item)}
        setMouseOver={this.props.setMouseOver}
        inputState={this.props.inputState}
      >
        <div className={messageClassName} style={messageStyle}>
          <Linkify>{text}</Linkify>
        </div>
      </ComposedMessage>
    );
  }
}

export default TextMessage;
