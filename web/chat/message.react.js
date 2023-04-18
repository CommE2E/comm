// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { messageTypes } from 'lib/types/message-types.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import { longAbsoluteDate } from 'lib/utils/date-utils.js';

import css from './chat-message-list.css';
import MultimediaMessage from './multimedia-message.react.js';
import RobotextMessage from './robotext-message.react.js';
import TextMessage from './text-message.react.js';

type Props = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +shouldDisplayPinIndicator: boolean,
};
function Message(props: Props): React.Node {
  const { item } = props;

  let conversationHeader = null;
  if (item.startsConversation) {
    conversationHeader = (
      <div className={css.conversationHeader}>
        {longAbsoluteDate(item.messageInfo.time)}
      </div>
    );
  }
  let message;
  if (item.messageInfo.type === messageTypes.TEXT) {
    message = (
      <TextMessage
        item={item}
        threadInfo={props.threadInfo}
        shouldDisplayPinIndicator={props.shouldDisplayPinIndicator}
      />
    );
  } else if (
    item.messageInfo.type === messageTypes.IMAGES ||
    item.messageInfo.type === messageTypes.MULTIMEDIA
  ) {
    message = (
      <MultimediaMessage
        item={item}
        threadInfo={props.threadInfo}
        shouldDisplayPinIndicator={props.shouldDisplayPinIndicator}
      />
    );
  } else {
    invariant(item.robotext, "Flow can't handle our fancy types :(");
    message = <RobotextMessage item={item} threadInfo={props.threadInfo} />;
  }
  return (
    <div className={css.message}>
      {conversationHeader}
      {message}
    </div>
  );
}

export default Message;
