// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { chatMessageInfoItemTimestamp } from 'lib/shared/chat-message-item-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import css from './chat-message-list.css';
import DeletedMessage from './deleted-message.react.js';
import { useEditModalContext } from './edit-message-provider.js';
import { ComposedEditTextMessage } from './edit-text-message.react.js';
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
        {chatMessageInfoItemTimestamp(item)}
      </div>
    );
  }

  const { editState } = useEditModalContext();

  let message;
  if (item.deleted) {
    message = <DeletedMessage item={item} threadInfo={props.threadInfo} />;
  } else if (
    item.messageInfoType === 'composable' &&
    item.messageInfo.id &&
    editState?.messageInfo.messageInfo?.id === item.messageInfo.id
  ) {
    message = (
      <ComposedEditTextMessage
        item={item}
        threadInfo={props.threadInfo}
        background={true}
      />
    );
  } else if (
    item.messageInfoType === 'composable' &&
    item.messageInfo.type === messageTypes.TEXT
  ) {
    message = (
      <TextMessage
        item={item}
        threadInfo={props.threadInfo}
        shouldDisplayPinIndicator={props.shouldDisplayPinIndicator}
      />
    );
  } else if (
    item.messageInfoType === 'composable' &&
    (item.messageInfo.type === messageTypes.IMAGES ||
      item.messageInfo.type === messageTypes.MULTIMEDIA)
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
