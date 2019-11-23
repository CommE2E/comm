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
import invariant from 'invariant';

import { longAbsoluteDate } from 'lib/utils/date-utils';

import TextMessage from './text-message.react';
import RobotextMessage from './robotext-message.react';
import MultimediaMessage from './multimedia-message.react';
import css from './chat-message-list.css';

export type OnMessagePositionInfo = {|
  type: "on",
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
export type MessagePositionInfo =
  | OnMessagePositionInfo
  | {|
      type: "off",
      item: ChatMessageInfoItem,
    |};
type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  setMouseOver: (messagePositionInfo: MessagePositionInfo) => void,
  chatInputState: ChatInputState,
  setModal: (modal: ?React.Node) => void,
  timeZone: ?string,
|};
class Message extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    setMouseOver: PropTypes.func.isRequired,
    chatInputState: chatInputStatePropType.isRequired,
    setModal: PropTypes.func.isRequired,
    timeZone: PropTypes.string,
  };

  render() {
    const { item, timeZone } = this.props;

    let conversationHeader = null;
    if (item.startsConversation) {
      conversationHeader = (
        <div className={css.conversationHeader}>
          {longAbsoluteDate(item.messageInfo.time, timeZone)}
        </div>
      );
    }
    let message;
    if (item.messageInfo.type === messageTypes.TEXT) {
      message = (
        <TextMessage
          item={item}
          threadInfo={this.props.threadInfo}
          setMouseOver={this.props.setMouseOver}
          chatInputState={this.props.chatInputState}
        />
      );
    } else if (
      item.messageInfo.type === messageTypes.IMAGES ||
      item.messageInfo.type === messageTypes.MULTIMEDIA
    ) {
      message = (
        <MultimediaMessage
          item={item}
          threadInfo={this.props.threadInfo}
          setMouseOver={this.props.setMouseOver}
          chatInputState={this.props.chatInputState}
          setModal={this.props.setModal}
        />
      );
    } else {
      invariant(item.robotext, "Flow can't handle our fancy types :(");
      message = (
        <RobotextMessage
          item={item}
          setMouseOver={this.props.setMouseOver}
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
