// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import {
  mostRecentlyReadThreadSelector,
  unreadCount,
} from 'lib/selectors/thread-selectors.js';

import NavigationPanel from './navigation-panel.react.js';
import css from './topbar.css';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { navTabSelector } from '../selectors/nav-selectors.js';

function AppSwitcher(): React.Node {
  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );
  const mostRecentlyReadThread = useSelector(mostRecentlyReadThreadSelector);
  const isActiveThreadCurrentlyUnread = useSelector(
    state =>
      !activeChatThreadID ||
      !!state.threadStore.threadInfos[activeChatThreadID]?.currentUser.unread,
  );

  const dispatch = useDispatch();

  const onClickChat = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          tab: 'chat',
          activeChatThreadID: isActiveThreadCurrentlyUnread
            ? mostRecentlyReadThread
            : activeChatThreadID,
        },
      });
    },
    [
      dispatch,
      isActiveThreadCurrentlyUnread,
      mostRecentlyReadThread,
      activeChatThreadID,
    ],
  );

  const boundUnreadCount = useSelector(unreadCount);

  let chatBadge = null;
  if (boundUnreadCount > 0) {
    chatBadge = <span className={css.chatBadge}>{boundUnreadCount}</span>;
  }

  const chatNavigationItem = React.useMemo(
    () => (
      <NavigationPanel.Item tab="chat">
        <a className={css.navigationPanelTab} onClick={onClickChat}>
          <span className={css.chatIconWrapper}>
            <SWMansionIcon icon="message-square" size={20} />
            {chatBadge}
          </span>
          <p>Chat</p>
        </a>
      </NavigationPanel.Item>
    ),
    [chatBadge, onClickChat],
  );

  const onClickCalendar = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: { tab: 'calendar' },
      });
    },
    [dispatch],
  );

  const isCalendarEnabled = useSelector(state => state.enabledApps.calendar);
  const calendarNavigationItem = React.useMemo(() => {
    if (!isCalendarEnabled) {
      return null;
    }
    return (
      <NavigationPanel.Item tab="calendar">
        <a className={css.navigationPanelTab} onClick={onClickCalendar}>
          <SWMansionIcon icon="calendar" size={20} />
          <p>Calendar</p>
        </a>
      </NavigationPanel.Item>
    );
  }, [isCalendarEnabled, onClickCalendar]);

  return (
    <NavigationPanel.Container tabSelector={navTabSelector} horizontal={true}>
      {chatNavigationItem}
      {calendarNavigationItem}
    </NavigationPanel.Container>
  );
}

export default AppSwitcher;
