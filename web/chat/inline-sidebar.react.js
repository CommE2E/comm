// @flow
import classNames from 'classnames';
import * as React from 'react';

import useInlineSidebarText from 'lib/hooks/inline-sidebar-text.react';
import type { ThreadInfo } from 'lib/types/thread-types';

import { useOnClickThread } from '../selectors/nav-selectors';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './inline-sidebar.css';

type Props = {
  +threadInfo: ThreadInfo,
  +position: 'left' | 'center' | 'right',
};
function InlineSidebar(props: Props): React.Node {
  const { threadInfo, position } = props;
  const { repliesText } = useInlineSidebarText(threadInfo);
  const onClick = useOnClickThread(threadInfo);
  const containerCls = classNames(css.container, [css[position]]);
  const replyCls = classNames({ [css.unread]: threadInfo.currentUser.unread });

  return (
    <div className={containerCls} onClick={onClick}>
      <SWMansionIcon icon="reply-chat-bubble" size={12} />
      <div className={replyCls}>{repliesText}</div>
    </div>
  );
}

export default InlineSidebar;
