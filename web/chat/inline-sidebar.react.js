// @flow

import * as React from 'react';

import useInlineSidebarText from 'lib/hooks/inline-sidebar-text.react';
import type { ThreadInfo } from 'lib/types/thread-types';

import { useOnClickThread } from '../selectors/nav-selectors';

type Props = {
  +threadInfo: ThreadInfo,
  +positioning: 'left' | 'center' | 'right',
};
function InlineSidebar(props: Props): React.Node {
  const { threadInfo } = props;
  const { sendersText, repliesText } = useInlineSidebarText(threadInfo);

  const onClick = useOnClickThread(threadInfo);

  return (
    <div onClick={onClick}>
      <div>
        {sendersText}
        {repliesText}
      </div>
    </div>
  );
}

export default InlineSidebar;
