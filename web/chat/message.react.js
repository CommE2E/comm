// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import {
  type OnMessagePositionInfo,
  type MessagePositionInfo,
  onMessagePositionInfoPropType,
} from './message-position-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { longAbsoluteDate } from 'lib/utils/date-utils';

import TextMessage from './text-message.react';
import RobotextMessage from './robotext-message.react';
import MultimediaMessage from './multimedia-message.react';
import css from './chat-message-list.css';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  mouseOverMessagePosition: ?OnMessagePositionInfo,
  setModal: (modal: ?React.Node) => void,
  timeZone: ?string,
|};
class Message extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    setMouseOverMessagePosition: PropTypes.func.isRequired,
    mouseOverMessagePosition: onMessagePositionInfoPropType,
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
          setMouseOverMessagePosition={this.props.setMouseOverMessagePosition}
          mouseOverMessagePosition={this.props.mouseOverMessagePosition}
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
          setMouseOverMessagePosition={this.props.setMouseOverMessagePosition}
          setModal={this.props.setModal}
        />
      );
    } else {
      invariant(item.robotext, "Flow can't handle our fancy types :(");
      message = (
        <RobotextMessage
          item={item}
          setMouseOverMessagePosition={this.props.setMouseOverMessagePosition}
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
