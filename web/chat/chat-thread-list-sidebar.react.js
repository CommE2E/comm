// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { SidebarInfo } from 'lib/types/thread-types';

import { useThreadIsActive } from '../selectors/nav-selectors';
import ChatThreadListItemMenu from './chat-thread-list-item-menu.react';
import css from './chat-thread-list.css';
import SidebarItem from './sidebar-item.react';

type Props = {
  +sidebarInfo: SidebarInfo,
};
function ChatThreadListSidebar(props: Props): React.Node {
  const { sidebarInfo } = props;
  const { threadInfo, mostRecentNonLocalMessage } = sidebarInfo;
  const threadID = threadInfo.id;
  const active = useThreadIsActive(threadID);

  return (
    <div
      className={classNames(css.threadListSidebar, css.sidebar, {
        [css.activeThread]: active,
      })}
    >
      <SidebarItem sidebarInfo={sidebarInfo} />
      <ChatThreadListItemMenu
        threadInfo={threadInfo}
        mostRecentNonLocalMessage={mostRecentNonLocalMessage}
        renderStyle="thread"
      />
    </div>
  );
}

export default ChatThreadListSidebar;
