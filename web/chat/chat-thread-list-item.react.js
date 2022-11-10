// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { ChatThreadItem } from 'lib/selectors/chat-selectors';
import { useAncestorThreads } from 'lib/shared/ancestor-threads';
import { shortAbsoluteDate } from 'lib/utils/date-utils';

import { useSelector } from '../redux/redux-utils';
import {
  useOnClickThread,
  useThreadIsActive,
} from '../selectors/thread-selectors';
import SWMansionIcon from '../SWMansionIcon.react';
import ChatThreadListItemMenu from './chat-thread-list-item-menu.react';
import ChatThreadListSeeMoreSidebars from './chat-thread-list-see-more-sidebars.react';
import ChatThreadListSidebar from './chat-thread-list-sidebar.react';
import css from './chat-thread-list.css';
import MessagePreview from './message-preview.react';

type Props = {
  +item: ChatThreadItem,
};
function ChatThreadListItem(props: Props): React.Node {
  const { item } = props;
  const {
    threadInfo,
    lastUpdatedTimeIncludingSidebars,
    mostRecentNonLocalMessage,
    mostRecentMessageInfo,
  } = item;
  const { id: threadID, currentUser } = threadInfo;

  const ancestorThreads = useAncestorThreads(threadInfo);

  const timeZone = useSelector(state => state.timeZone);
  const lastActivity = shortAbsoluteDate(
    lastUpdatedTimeIncludingSidebars,
    timeZone,
  );

  const active = useThreadIsActive(threadID);
  const isCreateMode = useSelector(
    state => state.navInfo.chatMode === 'create',
  );

  const onClick = useOnClickThread(item.threadInfo);

  const selectItemIfNotActiveCreation = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      if (!isCreateMode || !active) {
        onClick(event);
      }
    },
    [isCreateMode, active, onClick],
  );

  const containerClassName = React.useMemo(
    () =>
      classNames({
        [css.thread]: true,
        [css.activeThread]: active,
      }),
    [active],
  );

  const { unread } = currentUser;
  const titleClassName = React.useMemo(
    () =>
      classNames({
        [css.title]: true,
        [css.unread]: unread,
      }),
    [unread],
  );
  const lastActivityClassName = React.useMemo(
    () =>
      classNames({
        [css.lastActivity]: true,
        [css.unread]: unread,
        [css.dark]: !unread,
      }),
    [unread],
  );

  const breadCrumbsClassName = React.useMemo(
    () =>
      classNames(css.breadCrumbs, {
        [css.unread]: unread,
      }),
    [unread],
  );

  let unreadDot;
  if (unread) {
    unreadDot = <div className={css.unreadDot} />;
  }

  const { color } = item.threadInfo;
  const colorSplotchStyle = React.useMemo(
    () => ({ backgroundColor: `#${color}` }),
    [color],
  );

  const sidebars = item.sidebars.map((sidebarItem, index) => {
    if (sidebarItem.type === 'sidebar') {
      const { type, ...sidebarInfo } = sidebarItem;
      return (
        <ChatThreadListSidebar
          sidebarInfo={sidebarInfo}
          isSubsequentItem={index > 0}
          key={sidebarInfo.threadInfo.id}
        />
      );
    } else if (sidebarItem.type === 'seeMore') {
      return (
        <ChatThreadListSeeMoreSidebars
          threadInfo={item.threadInfo}
          unread={sidebarItem.unread}
          key="seeMore"
        />
      );
    } else {
      return <div className={css.spacer} key="spacer" />;
    }
  });

  const ancestorPath = ancestorThreads.map((thread, idx) => {
    const isNotLast = idx !== ancestorThreads.length - 1;
    const chevron = isNotLast && (
      <span className={css.breadCrumb}>
        <SWMansionIcon icon="chevron-right" size={10} />
      </span>
    );

    return (
      <React.Fragment key={thread.id}>
        <span className={css.breadCrumb}>{thread.uiName}</span>
        {chevron}
      </React.Fragment>
    );
  });

  return (
    <>
      <a className={containerClassName} onClick={selectItemIfNotActiveCreation}>
        <div className={css.colorContainer}>
          <div className={css.colorSplotchContainer}>
            <div className={css.dotContainer}>{unreadDot}</div>
            <div className={css.colorSplotch} style={colorSplotchStyle} />
          </div>
        </div>
        <div className={css.threadButton}>
          <p className={breadCrumbsClassName}>{ancestorPath}</p>
          <div className={css.threadRow}>
            <div className={titleClassName}>{threadInfo.uiName}</div>
          </div>
          <div className={css.threadRow}>
            <MessagePreview
              messageInfo={mostRecentMessageInfo}
              threadInfo={threadInfo}
            />
          </div>
        </div>
        <div>
          <ChatThreadListItemMenu
            threadInfo={threadInfo}
            mostRecentNonLocalMessage={mostRecentNonLocalMessage}
          />
          <div className={lastActivityClassName}>{lastActivity}</div>
        </div>
      </a>
      {sidebars}
    </>
  );
}

export default ChatThreadListItem;
