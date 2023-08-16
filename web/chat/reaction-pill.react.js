// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { useNextLocalID } from 'lib/shared/message-utils.js';

import { useSendReaction } from './reaction-message-utils.js';
import css from './reaction-pill.css';
import { useReactionTooltip } from '../utils/tooltip-action-utils.js';
import { tooltipPositions } from '../utils/tooltip-utils.js';

const availableReactionTooltipPositions = [
  tooltipPositions.TOP,
  tooltipPositions.BOTTOM,
];

type Props = {
  +reaction: string,
  +messageID: ?string,
  +threadID: string,
  +reactions: ReactionInfo,
};

function ReactionPill(props: Props): React.Node {
  const { reaction, messageID, threadID, reactions } = props;

  const localID = useNextLocalID();
  const sendReaction = useSendReaction(messageID, localID, threadID, reactions);

  const onClickReaction = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      sendReaction(reaction);
    },
    [reaction, sendReaction],
  );

  const { onMouseEnter, onMouseLeave } = useReactionTooltip({
    reaction,
    reactions,
    availablePositions: availableReactionTooltipPositions,
  });

  const reactionInfo = reactions[reaction];
  const numOfReacts = reactionInfo.users.length;

  const reactionClassName = classNames({
    [css.reactionContainer]: true,
    [css.reactionContainerSelected]: reactionInfo.viewerReacted,
  });

  return (
    <a
      onClick={onClickReaction}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={reactionClassName}
      key={reaction}
    >
      {`${reaction} ${numOfReacts}`}
    </a>
  );
}

export default ReactionPill;
