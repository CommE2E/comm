// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import {
  chatInputStatePropType,
  type ChatInputState,
} from './chat-input-state';

import * as React from 'react';
import PropTypes from 'prop-types';

import { longAbsoluteDate } from 'lib/utils/date-utils';

import TextMessage from './text-message.react';
import RobotextMessage from './robotext-message.react';
import MultimediaMessage from './multimedia-message.react';
import css from './chat-message-list.css';

export type MessagePositionInfo = {|
  item: ChatMessageInfoItem,
  messagePosition: {|
    top: number,
    bottom: number,
    left: number,
    right: number,
    height: number,
    width: number,
  |},
|};
type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  onMouseOver: (messagePositionInfo: MessagePositionInfo) => void,
  chatInputState: ChatInputState,
|};
class Message extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    onMouseOver: PropTypes.func.isRequired,
    chatInputState: chatInputStatePropType.isRequired,
  };

  render() {
    let conversationHeader = null;
    if (this.props.item.startsConversation) {
      conversationHeader = (
        <div className={css.conversationHeader}>
          {longAbsoluteDate(this.props.item.messageInfo.time)}
        </div>
      );
    }
    let message;
    if (this.props.item.messageInfo.type === messageTypes.TEXT) {
      message = (
        <TextMessage
          item={this.props.item}
          threadInfo={this.props.threadInfo}
          onMouseOver={this.props.onMouseOver}
        />
      );
    } else if (this.props.item.messageInfo.type === messageTypes.MULTIMEDIA) {
      message = (
        <MultimediaMessage
          item={this.props.item}
          onMouseOver={this.props.onMouseOver}
          chatInputState={this.props.chatInputState}
        />
      );
    } else {
      message = (
        <RobotextMessage
          item={this.props.item}
          onMouseOver={this.props.onMouseOver}
        />
      );
    }
    return (
      <div className={css.message}>
        {conversationHeader}
        {message}
      </div>
    );
  }

}

export default Message;
