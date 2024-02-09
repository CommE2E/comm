// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors';

import css from './reaction-tooltip.css';
import {
  tooltipLabelStyle,
  reactionTooltipStyle,
  reactionSeeMoreLabel,
  reactionSeeMoreLabelStyle,
} from './tooltip-constants.js';
import MessageReactionsModal from '../modals/chat/message-reactions-modal.react.js';

type Props = {
  +reactions: ReactionInfo,
  +usernames: $ReadOnlyArray<string>,
  +showSeeMoreText: boolean,
};

function ReactionTooltip(props: Props): React.Node {
  const { reactions, usernames, showSeeMoreText } = props;

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

  const usernameList = React.useMemo(() => {
    return usernames.map(username => (
      <p
        key={username}
        className={css.usernameText}
        style={{ height: tooltipLabelStyle.height }}
      >
        {username}
      </p>
    ));
  }, [usernames]);

  const seeMoreText = React.useMemo(() => {
    if (!showSeeMoreText) {
      return null;
    }

    return (
      <p
        className={css.seeMoreText}
        style={{ height: reactionSeeMoreLabelStyle.height }}
      >
        {reactionSeeMoreLabel}
      </p>
    );
  }, [showSeeMoreText]);

  return (
    <div
      className={css.container}
      onClick={onClickReactionTooltip}
      style={reactionTooltipStyle}
    >
      {usernameList}
      {seeMoreText}
    </div>
  );
}

export default ReactionTooltip;
