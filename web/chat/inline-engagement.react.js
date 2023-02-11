// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import useInlineEngagementText from 'lib/hooks/inline-engagement-text.react.js';
import type { MessageReactionInfo } from 'lib/selectors/chat-selectors.js';
import { stringForReactionList } from 'lib/shared/reaction-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import CommIcon from '../CommIcon.react.js';
import MessageReactionsModal from '../modals/chat/message-reactions-modal.react.js';
import { useOnClickThread } from '../selectors/thread-selectors.js';
import css from './inline-engagement.css';

type Props = {
  +threadInfo: ?ThreadInfo,
  +reactions?: $ReadOnlyMap<string, MessageReactionInfo>,
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

  const reactionsExist = reactions && reactions.size > 0;

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
    if (!reactions || reactions.size === 0) {
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
