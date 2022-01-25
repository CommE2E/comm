// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  mostRecentReadThreadSelector,
  unreadCount,
} from 'lib/selectors/thread-selectors';

import { useSelector } from '../redux/redux-utils';
import SWMansionIcon from '../SWMansionIcon.react';
import getTitle from '../title/getTitle';
import { updateNavInfoActionType } from '../types/nav-types';
import css from './left-layout-aside.css';

function AppSwitcher(): React.Node {
  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );
  const navInfo = useSelector(state => state.navInfo);
  const mostRecentReadThread = useSelector(mostRecentReadThreadSelector);
  const activeThreadCurrentlyUnread = useSelector(
    state =>
      !activeChatThreadID ||
      !!state.threadStore.threadInfos[activeChatThreadID]?.currentUser.unread,
  );
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const boundUnreadCount = useSelector(unreadCount);

  React.useEffect(() => {
    document.title = getTitle(boundUnreadCount);
  }, [boundUnreadCount]);

  const dispatch = useDispatch();

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

  invariant(viewerID, 'should be set');
  let chatBadge = null;
  if (boundUnreadCount > 0) {
    chatBadge = <div className={css.chatBadge}>{boundUnreadCount}</div>;
  }

  const calendarNavClasses = classNames({
    [css['current-tab']]: navInfo.tab === 'calendar',
  });
  const chatNavClasses = classNames({
    [css['current-tab']]: navInfo.tab === 'chat',
  });

  return (
    <div className={css.container}>
      <ul>
        <li>
          <p className={chatNavClasses}>
            <span className={css.chatIconWrapper}>
              <SWMansionIcon icon="message-square" size={24} />
              {chatBadge}
            </span>
            <a onClick={onClickChat}>Chat</a>
          </p>
        </li>
        <li>
          <p className={calendarNavClasses}>
            <SWMansionIcon icon="calendar" size={24} />
            <a onClick={onClickCalendar}>Calendar</a>
          </p>
        </li>
      </ul>
    </div>
  );
}

export default AppSwitcher;
