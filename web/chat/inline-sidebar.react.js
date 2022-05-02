// @flow

import * as React from 'react';

import useInlineSidebarText from 'lib/hooks/inline-sidebar-text.react';
import type { ThreadInfo } from 'lib/types/thread-types';

import { useOnClickThread } from '../selectors/nav-selectors';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './inline-sidebar.css';

type Props = {
  +threadInfo: ThreadInfo,
  +positioning: 'left' | 'center' | 'right',
};
function InlineSidebar(props: Props): React.Node {
  const { threadInfo } = props;
  const { repliesText } = useInlineSidebarText(threadInfo);
  const onClick = useOnClickThread(threadInfo);

  return (
    <div className={css.container} onClick={onClick}>
      <SWMansionIcon icon="reply-chat-bubble" size={12} />
      <div>{repliesText}</div>
    </div>
  );
}

export default InlineSidebar;
