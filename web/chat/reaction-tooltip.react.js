// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors';

import css from './reaction-tooltip.css';
import MessageReactionsModal from '../modals/chat/message-reactions-modal.react.js';

type Props = {
  +reactions: ReactionInfo,
  +reaction: ?string, // double check if this can be required
};

function ReactionTooltip(props: Props): React.Node {
  const { reactions, reaction } = props;
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

  const usernames = React.useMemo(() => {
    if (!reaction) {
      return null;
    }

    const users = reactions[reaction].users;

    return users.map(user => (
      <p key={user.id} className={css.usernameText}>
        {user.username}
      </p>
    ));
  }, [reaction, reactions]);

  let seeMoreText;
  if (usernames && usernames.length > 5) {
    seeMoreText = <p className={css.seeMoreText}>See more</p>;
  }

  return (
    <div className={css.container} onClick={onClickReactionTooltip}>
      {usernames}
      {seeMoreText}
    </div>
  );
}

export default ReactionTooltip;
