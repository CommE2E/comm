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
  const {
    currentUser: { unread },
    id: threadID,
  } = threadInfo;
  const active = useThreadIsActive(threadID);

  let unreadDot;
  if (unread) {
    unreadDot = <div className={css.unreadDot} />;
  }

  return (
    <div
      className={classNames(css.threadListSidebar, css.sidebar, {
        [css.activeThread]: active,
      })}
    >
      <div className={css.dotContainer}>{unreadDot}</div>
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
