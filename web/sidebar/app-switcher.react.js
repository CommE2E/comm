// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { mostRecentReadThreadSelector } from 'lib/selectors/thread-selectors';

import { useSelector } from '../redux/redux-utils';
import { updateNavInfoActionType } from '../types/nav-types';
import css from './sidebar.css';

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

  return (
    <div className={css.container}>
      <ul>
        <li>
          <p>
            <a onClick={onClickCalendar}>Calendar</a>
          </p>
        </li>
        <li>
          <p>
            <a onClick={onClickChat}>Chat</a>
          </p>
        </li>
      </ul>
    </div>
  );
}

export default AppSwitcher;
