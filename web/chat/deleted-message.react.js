// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import type { ComposableChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react.js';

type Props = {
  +item: ComposableChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};
function DeletedMessage(props: Props): React.Node {
  const messageClassName = classNames([
    css.textMessage,
    css.normalTextMessage,
    css.deletedMessageContent,
  ]);

  return (
    <ComposedMessage
      item={props.item}
      threadInfo={props.threadInfo}
      shouldDisplayPinIndicator={false}
      sendFailed={false}
    >
      <div className={messageClassName}>
        <SWMansionIcon icon="block-2" size={16} />
        <i>Deleted message</i>
      </div>
    </ComposedMessage>
  );
}

export default DeletedMessage;
