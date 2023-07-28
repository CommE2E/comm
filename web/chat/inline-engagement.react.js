// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { getInlineEngagementSidebarText } from 'lib/shared/inline-engagement-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import css from './inline-engagement.css';
import CommIcon from '../CommIcon.react.js';
import MessageReactionsModal from '../modals/chat/message-reactions-modal.react.js';
import { useOnClickThread } from '../selectors/thread-selectors.js';

type Props = {
  +sidebarThreadInfo: ?ThreadInfo,
  +reactions: ReactionInfo,
  +positioning: 'left' | 'center' | 'right',
  +label?: ?string,
};
function InlineEngagement(props: Props): React.Node {
  const { sidebarThreadInfo, reactions, positioning, label } = props;
  const { pushModal, popModal } = useModalContext();

  const isLeft = positioning === 'left';

  const labelClasses = classNames({
    [css.messageLabel]: true,
    [css.messageLabelLeft]: isLeft,
    [css.messageLabelRight]: !isLeft,
  });
  const editedLabel = React.useMemo(() => {
    if (!label) {
      return null;
    }
    return (
      <div className={labelClasses}>
        <span>{label}</span>
      </div>
    );
  }, [label, labelClasses]);

  const onClickSidebarInner = useOnClickThread(sidebarThreadInfo);

  const onClickSidebar = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      popModal();
      onClickSidebarInner(event);
    },
    [popModal, onClickSidebarInner],
  );

  const repliesText = getInlineEngagementSidebarText(sidebarThreadInfo);

  const sidebarItem = React.useMemo(() => {
    if (!sidebarThreadInfo || !repliesText) {
      return null;
    }

    return (
      <a onClick={onClickSidebar} className={css.sidebarContainer}>
        <CommIcon size={14} icon="sidebar-filled" />
        {repliesText}
      </a>
    );
  }, [sidebarThreadInfo, repliesText, onClickSidebar]);

  const onClickReaction = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      pushModal(
        <MessageReactionsModal onClose={popModal} reactions={reactions} />,
      );
    },
    [popModal, pushModal, reactions],
  );

  const reactionsList = React.useMemo(() => {
    if (Object.keys(reactions).length === 0) {
      return null;
    }

    return Object.keys(reactions).map(reaction => {
      const numOfReacts = reactions[reaction].users.length;

      return (
        <a
          onClick={onClickReaction}
          className={css.reactionContainer}
          key={reaction}
        >
          {`${reaction} ${numOfReacts}`}
        </a>
      );
    });
  }, [reactions, onClickReaction]);

  const containerClasses = classNames([
    css.inlineEngagementContainer,
    {
      [css.leftContainer]: positioning === 'left',
      [css.centerContainer]: positioning === 'center',
      [css.rightContainer]: positioning === 'right',
    },
  ]);

  return (
    <div className={containerClasses}>
      {editedLabel}
      {sidebarItem}
      {reactionsList}
    </div>
  );
}

export default InlineEngagement;
