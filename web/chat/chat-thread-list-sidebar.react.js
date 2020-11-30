// @flow

import type { SidebarInfo } from 'lib/types/thread-types';

import * as React from 'react';
import classNames from 'classnames';

import css from './chat-thread-list.css';
import SidebarItem from './sidebar-item.react';
import { useThreadIsActive } from '../selectors/nav-selectors';

type Props = {|
  +sidebarInfo: SidebarInfo,
|};
function ChatThreadListSidebar(props: Props) {
  const { threadInfo } = props.sidebarInfo;
  const threadID = threadInfo.id;
  const active = useThreadIsActive(threadID);
  const activeStyle = active ? css.activeThread : null;
  return (
    <div className={classNames(css.thread, css.sidebar, activeStyle)}>
      <SidebarItem sidebarInfo={props.sidebarInfo} />
    </div>
  );
}

export default ChatThreadListSidebar;
