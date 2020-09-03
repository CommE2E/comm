// @flow

import type { OnMessagePositionInfo } from './message-position-types';

import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReply } from '@fortawesome/free-solid-svg-icons';

import css from './chat-message-list.css';

type Props = {|
  +messagePositionInfo: OnMessagePositionInfo,
  +onReplyClick: () => void,
|};
function MessageReplyTooltip(props: Props) {
  return (
    <div className={css.messageReplyTooltip}>
      <div className={css.messageReplyTooltipIcon} onClick={props.onReplyClick}>
        <FontAwesomeIcon icon={faReply} />
      </div>
    </div>
  );
}

export default MessageReplyTooltip;
