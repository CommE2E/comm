// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import { unreadCount } from 'lib/selectors/thread-selectors.js';

import electron from './electron.js';
import getTitle from './title/getTitle.js';

function useBadgeHandler() {
  const boundUnreadCount = useSelector(unreadCount);

  React.useEffect(() => {
    document.title = getTitle(boundUnreadCount);
    electron?.setBadge(boundUnreadCount === 0 ? null : boundUnreadCount);
  }, [boundUnreadCount]);
}

export default useBadgeHandler;
