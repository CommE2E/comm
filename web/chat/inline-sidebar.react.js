// @flow

import classNames from 'classnames';
import * as React from 'react';

import useInlineSidebarText from 'lib/hooks/inline-sidebar-text.react';
import type { ThreadInfo } from 'lib/types/thread-types';

import CommIcon from '../CommIcon.react';
import { useOnClickThread } from '../selectors/nav-selectors';
import css from './inline-sidebar.css';

type Props = {
  +threadInfo: ?ThreadInfo,
  +reactions?: $ReadOnlyArray<string>,
  +positioning: 'left' | 'center' | 'right',
};
function InlineSidebar(props: Props): React.Node {
  const { threadInfo, positioning, reactions } = props;
  const inlineSidebarText = useInlineSidebarText(threadInfo);

  const containerClasses = classNames([
    css.inlineSidebarContainer,
    {
      [css.leftContainer]: positioning === 'left',
      [css.centerContainer]: positioning === 'center',
      [css.rightContainer]: positioning === 'right',
    },
  ]);

  const reactionsList = React.useMemo(() => {
    if (!reactions || reactions.length === 0) {
      return null;
    }
    const reactionsItems = reactions.map(reaction => {
      return (
        <div key={reaction} className={css.reactions}>
          {reaction}
        </div>
      );
    });
    return <div className={css.reactionsContainer}>{reactionsItems}</div>;
  }, [reactions]);

  const onClick = useOnClickThread(threadInfo);

  const threadInfoExists = !!threadInfo;

  const sidebarItem = React.useMemo(() => {
    if (!threadInfoExists || !inlineSidebarText) {
      return null;
    }

    return (
      <div className={css.replies}>
        <CommIcon size={14} icon="sidebar-filled" />
        {inlineSidebarText.repliesText}
      </div>
    );
  }, [threadInfoExists, inlineSidebarText]);

  return (
    <div className={containerClasses}>
      <a
        className={css.inlineSidebarContent}
        onClick={threadInfoExists ? onClick : null}
      >
        {sidebarItem}
        {reactionsList}
      </a>
    </div>
  );
}

export default InlineSidebar;
