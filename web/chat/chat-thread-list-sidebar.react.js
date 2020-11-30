// @flow

import type { SidebarInfo } from 'lib/types/thread-types';

import * as React from 'react';
import classNames from 'classnames';

import css from './chat-thread-list.css';
import SidebarItem from './sidebar-item.react';
import { useThreadIsActive } from '../selectors/nav-selectors';
import ChatThreadListItemMenu from './chat-thread-list-item-menu.react';

type Props = {|
  +sidebarInfo: SidebarInfo,
|};
function ChatThreadListSidebar(props: Props) {
  const { threadInfo, mostRecentNonLocalMessage } = props.sidebarInfo;
  const threadID = threadInfo.id;
  const active = useThreadIsActive(threadID);
  const activeStyle = active ? css.activeThread : null;
  return (
    <div className={classNames(css.thread, css.sidebar, activeStyle)}>
      <SidebarItem sidebarInfo={props.sidebarInfo} />
      <ChatThreadListItemMenu
        threadInfo={threadInfo}
        mostRecentNonLocalMessage={mostRecentNonLocalMessage}
      />
    </div>
  );
}

export default ChatThreadListSidebar;
