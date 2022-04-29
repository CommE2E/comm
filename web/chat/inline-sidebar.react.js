// @flow

import classNames from 'classnames';
import * as React from 'react';
import {
  CornerDownRight as CornerDownRightIcon,
  CornerDownLeft as CornerDownLeftIcon,
} from 'react-feather';

import useInlineSidebarText from 'lib/hooks/inline-sidebar-text.react';
import type { ThreadInfo } from 'lib/types/thread-types';

import { useOnClickThread } from '../selectors/nav-selectors';
import css from './inline-sidebar.css';

type Props = {
  +threadInfo: ThreadInfo,
  +positioning: 'left' | 'center' | 'right',
};
function InlineSidebar(props: Props): React.Node {
  const { threadInfo } = props;
  const { sendersText, repliesText } = useInlineSidebarText(threadInfo);

  const onClick = useOnClickThread(threadInfo);

  let viewerIcon, nonViewerIcon, alignStyle;
  if (props.positioning === 'right') {
    viewerIcon = (
      <CornerDownLeftIcon className={css.inlineSidebarIcon} size={18} />
    );
    alignStyle = css.viewerMessageBoxContainer;
  } else if (props.positioning === 'left') {
    nonViewerIcon = (
      <CornerDownRightIcon className={css.inlineSidebarIcon} size={18} />
    );
    alignStyle = css.nonViewerMessageBoxContainer;
  } else {
    nonViewerIcon = (
      <CornerDownRightIcon className={css.inlineSidebarIcon} size={18} />
    );
    alignStyle = css.centerContainer;
  }

  const unreadStyle = threadInfo.currentUser.unread ? css.unread : null;

  return (
    <div className={classNames([css.inlineSidebarContent, alignStyle])}>
      <div onClick={onClick} className={css.inlineSidebar}>
        {nonViewerIcon}
        <div className={classNames([css.inlineSidebarName, unreadStyle])}>
          {sendersText}
          {repliesText}
        </div>
        {viewerIcon}
      </div>
    </div>
  );
}

const inlineSidebarHeight = 20;

export { InlineSidebar, inlineSidebarHeight };
