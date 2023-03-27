// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import type { ChatThreadItem } from 'lib/selectors/chat-selectors.js';
import { useAncestorThreads } from 'lib/shared/ancestor-threads.js';
import { shortAbsoluteDate } from 'lib/utils/date-utils.js';
import {
  useResolvedThreadInfo,
  useResolvedThreadInfos,
} from 'lib/utils/entity-helpers.js';

import ChatThreadListItemMenu from './chat-thread-list-item-menu.react.js';
import ChatThreadListSeeMoreSidebars from './chat-thread-list-see-more-sidebars.react.js';
import ChatThreadListSidebar from './chat-thread-list-sidebar.react.js';
import css from './chat-thread-list.css';
import MessagePreview from './message-preview.react.js';
import ThreadAvatar from '../components/thread-avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';
import {
  useOnClickThread,
  useThreadIsActive,
} from '../selectors/thread-selectors.js';

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

  const unresolvedAncestorThreads = useAncestorThreads(threadInfo);
  const ancestorThreads = useResolvedThreadInfos(unresolvedAncestorThreads);

  const lastActivity = shortAbsoluteDate(lastUpdatedTimeIncludingSidebars);

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

  const containerClassName = classNames({
    [css.thread]: true,
    [css.activeThread]: active,
  });

  const { unread } = currentUser;
  const titleClassName = classNames({
    [css.title]: true,
    [css.unread]: unread,
  });
  const lastActivityClassName = classNames({
    [css.lastActivity]: true,
    [css.unread]: unread,
    [css.dark]: !unread,
  });

  const breadCrumbsClassName = classNames(css.breadCrumbs, {
    [css.unread]: unread,
  });

  let unreadDot;
  if (unread) {
    unreadDot = <div className={css.unreadDot} />;
  }

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

  const { uiName } = useResolvedThreadInfo(threadInfo);

  return (
    <>
      <a className={containerClassName} onClick={selectItemIfNotActiveCreation}>
        <div className={css.colorContainer}>
          <div className={css.colorSplotchContainer}>
            <div className={css.dotContainer}>{unreadDot}</div>
            <ThreadAvatar size="large" threadInfo={threadInfo} />
          </div>
        </div>
        <div className={css.threadButton}>
          <p className={breadCrumbsClassName}>{ancestorPath}</p>
          <div className={css.threadRow}>
            <div className={titleClassName}>{uiName}</div>
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
