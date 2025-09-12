// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { useSendReaction } from './reaction-message-utils.js';
import css from './reaction-pill.css';
import { useReactionTooltip } from '../tooltips/tooltip-action-utils.js';
import { tooltipPositions } from '../tooltips/tooltip-utils.js';

const availableReactionTooltipPositions = [
  tooltipPositions.TOP,
  tooltipPositions.BOTTOM,
];

type Props = {
  +reaction: string,
  +messageID: ?string,
  +threadInfo: ThreadInfo,
  +reactions: ReactionInfo,
};

function ReactionPill(props: Props): React.Node {
  const { reaction, messageID, threadInfo, reactions } = props;

  const sendReaction = useSendReaction(messageID, threadInfo, reactions);

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
  const numOfReacts = reactionInfo.count;

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
