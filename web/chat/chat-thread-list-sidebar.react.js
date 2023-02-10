// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { SidebarInfo } from 'lib/types/thread-types.js';

import ChatThreadListItemMenu from './chat-thread-list-item-menu.react.js';
import css from './chat-thread-list.css';
import SidebarItem from './sidebar-item.react.js';
import {
  useOnClickThread,
  useThreadIsActive,
} from '../selectors/thread-selectors.js';

type Props = {
  +sidebarInfo: SidebarInfo,
  +isSubsequentItem: boolean,
};
function ChatThreadListSidebar(props: Props): React.Node {
  const { sidebarInfo, isSubsequentItem } = props;
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
    <a
      className={classNames(css.threadListSidebar, css.sidebar, {
        [css.activeThread]: active,
      })}
      onClick={onClick}
    >
      <div className={css.dotContainer}>{unreadDot}</div>
      <SidebarItem sidebarInfo={sidebarInfo} extendArrow={isSubsequentItem} />
      <ChatThreadListItemMenu
        threadInfo={threadInfo}
        mostRecentNonLocalMessage={mostRecentNonLocalMessage}
        renderStyle="thread"
      />
    </a>
  );
}

export default ChatThreadListSidebar;
