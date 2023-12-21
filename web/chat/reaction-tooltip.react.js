// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors';

import {
  tooltipLabelStyle,
  reactionTooltipStyle,
  reactionSeeMoreLabel,
  reactionSeeMoreLabelStyle,
} from './chat-constants.js';
import css from './reaction-tooltip.css';
import MessageReactionsModal from '../modals/chat/message-reactions-modal.react.js';

const useENSNamesOptions = { allAtOnce: true };

type Props = {
  +reactions: ReactionInfo,
  +reaction: string,
};

function ReactionTooltip(props: Props): React.Node {
  const { reactions, reaction } = props;
  const { users } = reactions[reaction];

  const { pushModal, popModal } = useModalContext();

  const onClickReactionTooltip = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();

      pushModal(
        <MessageReactionsModal onClose={popModal} reactions={reactions} />,
      );
    },
    [popModal, pushModal, reactions],
  );

  const resolvedUsers = useENSNames(users, useENSNamesOptions);

  const usernames = React.useMemo(() => {
    return resolvedUsers.map(user => (
      <p
        key={user.id}
        className={css.usernameText}
        style={{ height: tooltipLabelStyle.height }}
      >
        {user.username}
      </p>
    ));
  }, [resolvedUsers]);

  let seeMoreText;
  if (usernames && usernames.length > 5) {
    seeMoreText = (
      <p
        className={css.seeMoreText}
        style={{ height: reactionSeeMoreLabelStyle.height }}
      >
        {reactionSeeMoreLabel}
      </p>
    );
  }

  return (
    <div
      className={css.container}
      onClick={onClickReactionTooltip}
      style={reactionTooltipStyle}
    >
      {usernames}
      {seeMoreText}
    </div>
  );
}

export default ReactionTooltip;
