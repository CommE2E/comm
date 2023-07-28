// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { getInlineEngagementSidebarText } from 'lib/shared/inline-engagement-utils.js';
import { stringForReactionList } from 'lib/shared/reaction-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import css from './inline-engagement.css';
import CommIcon from '../CommIcon.react.js';
import MessageReactionsModal from '../modals/chat/message-reactions-modal.react.js';
import { useOnClickThread } from '../selectors/thread-selectors.js';

type Props = {
  +sidebarThreadInfo: ?ThreadInfo,
  +reactions?: ReactionInfo,
  +positioning: 'left' | 'center' | 'right',
  +label?: ?string,
};
function InlineEngagement(props: Props): React.Node {
  const { sidebarThreadInfo, reactions, positioning, label } = props;
  const { pushModal, popModal } = useModalContext();
  const repliesText = getInlineEngagementSidebarText(sidebarThreadInfo);

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

  const onClickReactions = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      if (!reactions) {
        return;
      }
      pushModal(
        <MessageReactionsModal onClose={popModal} reactions={reactions} />,
      );
    },
    [popModal, pushModal, reactions],
  );

  const reactionsList = React.useMemo(() => {
    if (!reactions || Object.keys(reactions).length === 0) {
      return null;
    }

    const reactionText = stringForReactionList(reactions);

    return (
      <a onClick={onClickReactions} className={css.reactionsContainer}>
        {reactionText}
      </a>
    );
  }, [reactions, onClickReactions]);

  const containerClasses = classNames([
    css.inlineEngagementContainer,
    {
      [css.leftContainer]: positioning === 'left',
      [css.centerContainer]: positioning === 'center',
      [css.rightContainer]: positioning === 'right',
    },
  ]);

  let body;
  if (isLeft) {
    body = (
      <>
        {editedLabel}
        {sidebarItem}
        {reactionsList}
      </>
    );
  } else {
    body = (
      <>
        {sidebarItem}
        {reactionsList}
        {editedLabel}
      </>
    );
  }
  return <div className={containerClasses}>{body}</div>;
}

export default InlineEngagement;
