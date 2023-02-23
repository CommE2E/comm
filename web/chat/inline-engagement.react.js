// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react';
import useInlineEngagementText from 'lib/hooks/inline-engagement-text.react';
import type { ReactionInfo } from 'lib/selectors/chat-selectors';
import { stringForReactionList } from 'lib/shared/reaction-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import CommIcon from '../CommIcon.react';
import MessageReactionsModal from '../modals/chat/message-reactions-modal.react';
import { useOnClickThread } from '../selectors/thread-selectors';
import css from './inline-engagement.css';

type Props = {
  +threadInfo: ?ThreadInfo,
  +reactions?: ReactionInfo,
  +positioning: 'left' | 'center' | 'right',
};
function InlineEngagement(props: Props): React.Node {
  const { threadInfo, reactions, positioning } = props;
  const { pushModal, popModal } = useModalContext();
  const repliesText = useInlineEngagementText(threadInfo);

  const containerClasses = classNames([
    css.inlineEngagementContainer,
    {
      [css.leftContainer]: positioning === 'left',
      [css.centerContainer]: positioning === 'center',
      [css.rightContainer]: positioning === 'right',
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

  return (
    <div className={containerClasses}>
      {sidebarItem}
      {reactionsList}
    </div>
  );
}

export default InlineEngagement;
