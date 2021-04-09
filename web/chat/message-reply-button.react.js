// @flow

import { faReply } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import { createMessageReply } from 'lib/shared/message-utils';

import type { InputState } from '../input/input-state';
import css from './chat-message-list.css';
import type { OnMessagePositionWithContainerInfo } from './position-types';

type Props = {|
  +messagePositionInfo: OnMessagePositionWithContainerInfo,
  +onReplyClick: () => void,
  +inputState: InputState,
|};
function MessageReplyButton(props: Props) {
  const { inputState, onReplyClick, messagePositionInfo } = props;
  const { addReply } = inputState;

  const { item } = messagePositionInfo;
  const replyClicked = React.useCallback(() => {
    invariant(item.messageInfo.text, 'text should be set in message clicked');
    addReply(createMessageReply(item.messageInfo.text));
    onReplyClick();
  }, [addReply, item, onReplyClick]);

  const { isViewer } = item.messageInfo.creator;
  const replyButtonClassName = classNames({
    [css.messageReplyButton]: true,
    [css.tooltipRightPadding]: isViewer,
    [css.tooltipLeftPadding]: !isViewer,
  });

  return (
    <div className={replyButtonClassName}>
      <div className={css.messageTooltipIcon} onClick={replyClicked}>
        <FontAwesomeIcon icon={faReply} />
      </div>
    </div>
  );
}

export default MessageReplyButton;
