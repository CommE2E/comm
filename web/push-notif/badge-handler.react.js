// @flow

import * as React from 'react';

import { allConnectionInfosSelector } from 'lib/selectors/keyserver-selectors.js';
import { allUnreadCounts } from 'lib/selectors/thread-selectors.js';

import {
  updateNotifsUnreadCountStorage,
  queryNotifsUnreadCountStorage,
} from './notif-crypto-utils.js';
import electron from '../electron.js';
import { useSelector } from '../redux/redux-utils.js';
import getTitle from '../title/get-title.js';

function useBadgeHandler() {
  const connection = useSelector(allConnectionInfosSelector);
  const unreadCount = useSelector(allUnreadCounts);

  React.useEffect(() => {
    void (async () => {
      const unreadCountUpdates: {
        [keyserverID: string]: number,
      } = {};
      const unreadCountQueries: Array<string> = [];

      for (const keyserverID in unreadCount) {
        if (connection[keyserverID]?.status !== 'connected') {
          unreadCountQueries.push(keyserverID);
          continue;
        }
        unreadCountUpdates[keyserverID] = unreadCount[keyserverID];
      }

      let queriedUnreadCounts: { +[keyserverID: string]: ?number } = {};
      [queriedUnreadCounts] = await Promise.all([
        queryNotifsUnreadCountStorage(unreadCountQueries),
        updateNotifsUnreadCountStorage(unreadCountUpdates),
      ]);

      let totalUnreadCount = 0;
      for (const keyserverID in unreadCountUpdates) {
        totalUnreadCount += unreadCountUpdates[keyserverID];
      }

      for (const keyserverID in queriedUnreadCounts) {
        if (!queriedUnreadCounts[keyserverID]) {
          totalUnreadCount += unreadCount[keyserverID];
          continue;
        }
        totalUnreadCount += queriedUnreadCounts[keyserverID];
      }

      document.title = getTitle(totalUnreadCount);
      electron?.setBadge(totalUnreadCount === 0 ? null : totalUnreadCount);
    })();
  }, [unreadCount, connection]);
}

export default useBadgeHandler;
