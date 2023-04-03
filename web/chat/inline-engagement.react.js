// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import useInlineEngagementText from 'lib/hooks/inline-engagement-text.react.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { stringForReactionList } from 'lib/shared/reaction-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import css from './inline-engagement.css';
import CommIcon from '../CommIcon.react.js';
import MessageReactionsModal from '../modals/chat/message-reactions-modal.react.js';
import { useOnClickThread } from '../selectors/thread-selectors.js';
import { shouldRenderAvatars } from '../utils/avatar-utils.js';

type Props = {
  +threadInfo: ?ThreadInfo,
  +reactions?: ReactionInfo,
  +positioning: 'left' | 'center' | 'right',
  +label?: ?string,
};
function InlineEngagement(props: Props): React.Node {
  const { threadInfo, reactions, positioning, label } = props;
  const { pushModal, popModal } = useModalContext();
  const repliesText = useInlineEngagementText(threadInfo);

  const containerClasses = classNames([
    css.inlineEngagementContainer,
    {
      [css.leftContainer]: positioning === 'left',
      [css.centerContainer]: positioning === 'center',
      [css.rightContainer]: positioning === 'right',
      [css.leftContainerNoAvatar]:
        positioning === 'left' && !shouldRenderAvatars,
    },
  ]);

  const reactionsExist = reactions && Object.keys(reactions).length > 0;

  const threadsContainerClasses = classNames({
    [css.threadsContainer]: threadInfo && !reactionsExist,
    [css.threadsSplitContainer]: threadInfo && reactionsExist,
  });

  const reactionsContainerClasses = classNames({
    [css.reactionsContainer]: reactionsExist && !threadInfo,
    [css.reactionsSplitContainer]: reactionsExist && threadInfo,
  });

  const onClickThread = useOnClickThread(threadInfo);

  const sidebarItem = React.useMemo(() => {
    if (!threadInfo || !repliesText) {
      return null;
    }

    return (
      <a onClick={onClickThread} className={threadsContainerClasses}>
        <CommIcon size={14} icon="sidebar-filled" />
        {repliesText}
      </a>
    );
  }, [threadInfo, repliesText, onClickThread, threadsContainerClasses]);

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
      <a onClick={onClickReactions} className={reactionsContainerClasses}>
        {reactionText}
      </a>
    );
  }, [reactions, onClickReactions, reactionsContainerClasses]);

  const isLeft = positioning === 'left';
  const labelClasses = classNames({
    [css.messageLabel]: true,
    [css.messageLabelLeft]: isLeft,
    [css.messageLabelRight]: !isLeft,
    [css.onlyMessageLabel]: !sidebarItem && !reactionsList,
  });
  const messageLabel = React.useMemo(() => {
    if (!label) {
      return null;
    }
    return (
      <div className={labelClasses}>
        <span>{label}</span>
      </div>
    );
  }, [label, labelClasses]);

  let body;
  if (isLeft) {
    body = (
      <>
        {messageLabel}
        {sidebarItem}
        {reactionsList}
      </>
    );
  } else {
    body = (
      <>
        {sidebarItem}
        {reactionsList}
        {messageLabel}
      </>
    );
  }
  return <div className={containerClasses}>{body}</div>;
}

export default InlineEngagement;
