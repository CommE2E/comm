// @flow

import * as React from 'react';

import { mostRecentlyReadThreadSelector } from 'lib/selectors/thread-selectors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import AppListHeader from './app-list-header.react.js';
import AppListItem from './app-list-item.react.js';
import css from './app-list.css';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';

function AppList(): React.Node {
  const dispatch = useDispatch();

  const onClickCalendar = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: { tab: 'calendar' },
    });
  }, [dispatch]);

  const isCalendarEnabled = useSelector(state => state.enabledApps.calendar);

  const calendarAppListItem = React.useMemo(() => {
    if (!isCalendarEnabled) {
      return null;
    }

    return (
      <AppListItem
        id="calendar"
        name="Calendar"
        icon="calendar"
        onClick={onClickCalendar}
      />
    );
  }, [isCalendarEnabled, onClickCalendar]);

  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
  );
  const mostRecentlyReadThread = useSelector(mostRecentlyReadThreadSelector);
  const isActiveThreadCurrentlyUnread = useSelector(
    state =>
      !activeChatThreadID ||
      !!state.threadStore.threadInfos[activeChatThreadID]?.currentUser.unread,
  );

  const onClickInbox = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: {
        tab: 'chat',
        activeChatThreadID: isActiveThreadCurrentlyUnread
          ? mostRecentlyReadThread
          : activeChatThreadID,
      },
    });
  }, [
    dispatch,
    isActiveThreadCurrentlyUnread,
    mostRecentlyReadThread,
    activeChatThreadID,
  ]);

  const appListBody = React.useMemo(
    () => (
      <div className={css.appList}>
        <AppListItem
          id="chat"
          icon="message-square"
          name="Inbox"
          onClick={onClickInbox}
        />
        {calendarAppListItem}
      </div>
    ),
    [calendarAppListItem, onClickInbox],
  );

  const appList = React.useMemo(
    () => (
      <div className={css.container}>
        <AppListHeader />
        {appListBody}
      </div>
    ),
    [appListBody],
  );

  return appList;
}

export default AppList;
