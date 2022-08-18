// @flow

import invariant from 'invariant';
import * as React from 'react';

import { createMessageReply } from 'lib/shared/message-utils';

import CommIcon from '../CommIcon.react.js';
import type { InputState } from '../input/input-state';
import css from './chat-message-list.css';
import type { OnMessagePositionWithContainerInfo } from './position-types';

type Props = {
  +messagePositionInfo: OnMessagePositionWithContainerInfo,
  +onReplyClick: () => void,
  +inputState: InputState,
};
function MessageReplyButton(props: Props): React.Node {
  const { inputState, onReplyClick, messagePositionInfo } = props;
  const { addReply } = inputState;

  const { item } = messagePositionInfo;
  const replyClicked = React.useCallback(() => {
    invariant(item.messageInfo.text, 'text should be set in message clicked');
    addReply(createMessageReply(item.messageInfo.text));
    onReplyClick();
  }, [addReply, item, onReplyClick]);

  return (
    <div className={css.messageActionLinkIcon} onClick={replyClicked}>
      <CommIcon icon="reply-filled" size={18} />
    </div>
  );
}

export default MessageReplyButton;
