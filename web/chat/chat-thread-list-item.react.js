// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { ChatThreadItem } from 'lib/selectors/chat-selectors';
import { shortAbsoluteDate } from 'lib/utils/date-utils';

import { useSelector } from '../redux/redux-utils';
import {
  useOnClickThread,
  useThreadIsActive,
} from '../selectors/nav-selectors';
import ChatThreadListItemMenu from './chat-thread-list-item-menu.react';
import ChatThreadListSeeMoreSidebars from './chat-thread-list-see-more-sidebars.react';
import ChatThreadListSidebar from './chat-thread-list-sidebar.react';
import css from './chat-thread-list.css';
import MessagePreview from './message-preview.react';

type Props = {|
  +item: ChatThreadItem,
  +setModal: (modal: ?React.Node) => void,
|};
function ChatThreadListItem(props: Props) {
  const { item, setModal } = props;
  const threadID = item.threadInfo.id;

  const onClick = useOnClickThread(threadID);

  const timeZone = useSelector(state => state.timeZone);
  const lastActivity = shortAbsoluteDate(item.lastUpdatedTime, timeZone);

  const active = useThreadIsActive(threadID);
  const containerClassName = React.useMemo(
    () =>
      classNames({
        [css.thread]: true,
        [css.activeThread]: active,
      }),
    [active],
  );

  const { unread } = item.threadInfo.currentUser;
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

  const { color } = item.threadInfo;
  const colorSplotchStyle = React.useMemo(
    () => ({ backgroundColor: `#${color}` }),
    [color],
  );

  const sidebars = item.sidebars.map(sidebarItem => {
    if (sidebarItem.type === 'sidebar') {
      const { type, ...sidebarInfo } = sidebarItem;
      return (
        <ChatThreadListSidebar
          sidebarInfo={sidebarInfo}
          key={sidebarInfo.threadInfo.id}
        />
      );
    } else if (sidebarItem.type === 'seeMore') {
      return (
        <ChatThreadListSeeMoreSidebars
          threadInfo={item.threadInfo}
          unread={sidebarItem.unread}
          showingSidebarsInline={sidebarItem.showingSidebarsInline}
          setModal={setModal}
          key="seeMore"
        />
      );
    } else {
      return <div className={css.spacer} key="spacer" />;
    }
  });

  return (
    <>
      <div className={containerClassName}>
        <a className={css.threadButton} onClick={onClick}>
          <div className={css.threadRow}>
            <div className={titleClassName}>{item.threadInfo.uiName}</div>
            <div className={css.colorSplotch} style={colorSplotchStyle} />
          </div>
          <div className={css.threadRow}>
            <MessagePreview
              messageInfo={item.mostRecentMessageInfo}
              threadInfo={item.threadInfo}
            />
            <div className={lastActivityClassName}>{lastActivity}</div>
          </div>
        </a>
        <ChatThreadListItemMenu
          threadInfo={item.threadInfo}
          mostRecentNonLocalMessage={item.mostRecentNonLocalMessage}
        />
      </div>
      {sidebars}
    </>
  );
}

export default ChatThreadListItem;
