// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { SidebarInfo } from 'lib/types/thread-types';

import {
  useOnClickThread,
  useThreadIsActive,
} from '../selectors/nav-selectors';
import ChatThreadListItemMenu from './chat-thread-list-item-menu.react';
import css from './chat-thread-list.css';
import SidebarItem from './sidebar-item.react';

type Props = {
  +sidebarInfo: SidebarInfo,
  +isMultipleSidebarItem: boolean,
};
function ChatThreadListSidebar(props: Props): React.Node {
  const { sidebarInfo, isMultipleSidebarItem } = props;
  const { threadInfo, mostRecentNonLocalMessage } = sidebarInfo;
  const {
    currentUser: { unread },
    id: threadID,
  } = threadInfo;
  const active = useThreadIsActive(threadID);

  const onClick = useOnClickThread(threadInfo);
  let unreadDot;
  if (unread) {
    unreadDot = <div className={css.unreadDot} />;
  }

  return (
    <div
      className={classNames(css.threadListSidebar, css.sidebar, {
        [css.activeThread]: active,
      })}
      onClick={onClick}
    >
      <div className={css.dotContainer}>{unreadDot}</div>
      <SidebarItem
        sidebarInfo={sidebarInfo}
        extendArrow={isMultipleSidebarItem}
      />
      <ChatThreadListItemMenu
        threadInfo={threadInfo}
        mostRecentNonLocalMessage={mostRecentNonLocalMessage}
        renderStyle="thread"
      />
    </div>
  );
}

export default ChatThreadListSidebar;
