// @flow

import { faReply } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import invariant from 'invariant';
import { createMessageReply } from 'lib/shared/message-utils';
import * as React from 'react';

import type { InputState } from '../input/input-state';

import css from './chat-message-list.css';
import type { OnMessagePositionInfo } from './message-position-types';

type Props = {|
  +messagePositionInfo: OnMessagePositionInfo,
  +onReplyClick: () => void,
  +inputState: InputState,
|};
function MessageReplyTooltip(props: Props) {
  const { inputState, onReplyClick, messagePositionInfo } = props;
  const { addReply } = inputState;

  const replyClicked = React.useCallback(() => {
    const { item } = messagePositionInfo;
    invariant(item.messageInfo.text, 'text should be set in message clicked');
    addReply(createMessageReply(item.messageInfo.text));
    onReplyClick();
  }, [addReply, messagePositionInfo, onReplyClick]);

  return (
    <div className={css.messageReplyTooltip}>
      <div className={css.messageReplyTooltipIcon} onClick={replyClicked}>
        <FontAwesomeIcon icon={faReply} />
      </div>
    </div>
  );
}

export default MessageReplyTooltip;
