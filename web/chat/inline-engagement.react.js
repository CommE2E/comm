// @flow

import classNames from 'classnames';
import * as React from 'react';

import useInlineEngagementText from 'lib/hooks/inline-engagement-text.react';
import type { MessageReactionInfo } from 'lib/selectors/chat-selectors';
import { stringForReactionList } from 'lib/shared/reaction-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import CommIcon from '../CommIcon.react';
import { useOnClickThread } from '../selectors/thread-selectors';
import css from './inline-engagement.css';

type Props = {
  +threadInfo: ?ThreadInfo,
  +reactions?: $ReadOnlyMap<string, MessageReactionInfo>,
  +positioning: 'left' | 'center' | 'right',
};
function InlineEngagement(props: Props): React.Node {
  const { threadInfo, positioning, reactions } = props;
  const repliesText = useInlineEngagementText(threadInfo);

  const containerClasses = classNames([
    css.inlineEngagementContainer,
    {
      [css.leftContainer]: positioning === 'left',
      [css.centerContainer]: positioning === 'center',
      [css.rightContainer]: positioning === 'right',
    },
  ]);

  const reactionsList = React.useMemo(() => {
    if (!reactions || reactions.size === 0) {
      return null;
    }

    const reactionText = stringForReactionList(reactions);

    return <div className={css.reactionsContainer}>{reactionText}</div>;
  }, [reactions]);

  const onClick = useOnClickThread(threadInfo);

  const threadInfoExists = !!threadInfo;

  const sidebarItem = React.useMemo(() => {
    if (!threadInfoExists || !repliesText) {
      return null;
    }

    return (
      <div className={css.replies}>
        <CommIcon size={14} icon="sidebar-filled" />
        {repliesText}
      </div>
    );
  }, [threadInfoExists, repliesText]);

  return (
    <div className={containerClasses}>
      <a
        className={css.inlineEngagementContent}
        onClick={threadInfoExists ? onClick : null}
      >
        {sidebarItem}
        {reactionsList}
      </a>
    </div>
  );
}

export default InlineEngagement;
