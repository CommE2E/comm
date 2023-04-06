// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import { unreadCount } from 'lib/selectors/thread-selectors.js';

import electron from '../electron.js';
import getTitle from '../title/getTitle.js';

function useBadgeHandler() {
  const connection = useSelector(state => state.connection);
  const prevConnection = React.useRef();

  const boundUnreadCount = useSelector(unreadCount);
  const prevUnreadCount = React.useRef(boundUnreadCount);

  React.useEffect(() => {
    if (
      connection.status === 'connected' &&
      (prevConnection.current?.status !== 'connected' ||
        boundUnreadCount !== prevUnreadCount.current)
    ) {
      document.title = getTitle(boundUnreadCount);
      electron?.setBadge(boundUnreadCount === 0 ? null : boundUnreadCount);
    }

    prevConnection.current = connection;
    prevUnreadCount.current = boundUnreadCount;
  }, [boundUnreadCount, connection]);
}

export default useBadgeHandler;
