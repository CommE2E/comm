// @flow

import invariant from 'invariant';
import * as React from 'react';

import { connectionSelector } from 'lib/selectors/keyserver-selectors.js';
import { unreadCount } from 'lib/selectors/thread-selectors.js';

import electron from '../electron.js';
import { useSelector } from '../redux/redux-utils.js';
import getTitle from '../title/getTitle.js';

function useBadgeHandler() {
  const connection = useSelector(connectionSelector);
  invariant(connection, 'keyserver missing from keyserverStore');
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
