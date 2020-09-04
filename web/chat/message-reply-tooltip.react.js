// @flow

import type { OnMessagePositionInfo } from './message-position-types';

import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReply } from '@fortawesome/free-solid-svg-icons';
import { createMessageReply } from 'lib/shared/message-utils';
import invariant from 'invariant';

import css from './chat-message-list.css';
import type { InputState } from '../input/input-state';

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
