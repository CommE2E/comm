// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  mostRecentReadThreadSelector,
  unreadCount,
} from 'lib/selectors/thread-selectors';

import { useSelector } from '../redux/redux-utils';
import SWMansionIcon from '../SWMansionIcon.react';
import { updateNavInfoActionType } from '../types/nav-types';
import css from './left-layout-aside.css';
import NavigationPanel from './navigation-panel.react';

function AppSwitcher(): React.Node {
  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );
  const mostRecentReadThread = useSelector(mostRecentReadThreadSelector);
  const activeThreadCurrentlyUnread = useSelector(
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
          activeChatThreadID: activeThreadCurrentlyUnread
            ? mostRecentReadThread
            : activeChatThreadID,
        },
      });
    },
    [
      dispatch,
      activeThreadCurrentlyUnread,
      mostRecentReadThread,
      activeChatThreadID,
    ],
  );

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const boundUnreadCount = useSelector(unreadCount);

  invariant(viewerID, 'should be set');
  let chatBadge = null;
  if (boundUnreadCount > 0) {
    chatBadge = <span className={css.chatBadge}>{boundUnreadCount}</span>;
  }

  const chatNavigationItem = React.useMemo(
    () => (
      <NavigationPanel.Item tab="chat">
        <p>
          <span className={css.chatIconWrapper}>
            <SWMansionIcon icon="message-square" size={24} />
            {chatBadge}
          </span>
          <a onClick={onClickChat}>Chat</a>
        </p>
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
        <p>
          <SWMansionIcon icon="calendar" size={24} />
          <a onClick={onClickCalendar}>Calendar</a>
        </p>
      </NavigationPanel.Item>
    );
  }, [isCalendarEnabled, onClickCalendar]);

  const onClickApps = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          tab: 'apps',
        },
      });
    },
    [dispatch],
  );

  const appNavigationItem = React.useMemo(
    () => (
      <NavigationPanel.Item tab="apps">
        <p>
          <SWMansionIcon icon="wrench" size={24} />
          <a onClick={onClickApps}>Apps</a>
        </p>
      </NavigationPanel.Item>
    ),
    [onClickApps],
  );

  return (
    <NavigationPanel.Container>
      {chatNavigationItem}
      {calendarNavigationItem}
      {appNavigationItem}
    </NavigationPanel.Container>
  );
}

export default AppSwitcher;
