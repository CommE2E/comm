// @flow

import * as React from 'react';

import { connectionSelector } from 'lib/selectors/keyserver-selectors.js';
import { unreadCount } from 'lib/selectors/thread-selectors.js';
import type { ConnectionInfo } from 'lib/types/socket-types.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import electron from '../electron.js';
import { useSelector } from '../redux/redux-utils.js';
import getTitle from '../title/getTitle.js';

function useBadgeHandler() {
  const connection = useSelector(connectionSelector(ashoatKeyserverID));
  const prevConnection = React.useRef<?ConnectionInfo>();

  const boundUnreadCount = useSelector(unreadCount);
  const prevUnreadCount = React.useRef(boundUnreadCount);

  React.useEffect(() => {
    if (
      connection?.status === 'connected' &&
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
