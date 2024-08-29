// @flow

import * as React from 'react';

import { allConnectionInfosSelector } from 'lib/selectors/keyserver-selectors.js';
import {
  allUnreadCounts,
  unreadThickThreadIDsSelector,
} from 'lib/selectors/thread-selectors.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';

import {
  updateNotifsUnreadCountStorage,
  queryNotifsUnreadCountStorage,
  getNotifsUnreadThickThreadIDs,
  updateNotifsUnreadThickThreadIDsStorage,
} from './notif-crypto-utils.js';
import electron from '../electron.js';
import { useSelector } from '../redux/redux-utils.js';
import getTitle from '../title/get-title.js';

function useBadgeHandler() {
  const connection = useSelector(allConnectionInfosSelector);
  const unreadCount = useSelector(allUnreadCounts);

  const { socketState: tunnelbrokerSocketState } = useTunnelbroker();
  const currentUnreadThickThreadIDs = useSelector(unreadThickThreadIDsSelector);

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
      let unreadThickThreadIDs: $ReadOnlyArray<string> = [];

      const handleUnreadThickThreadIDsInNotifsStoragePromise = (async () => {
        if (tunnelbrokerSocketState.connected) {
          await updateNotifsUnreadThickThreadIDsStorage({
            type: 'set',
            threadIDs: currentUnreadThickThreadIDs,
            forceWrite: true,
          });
          return currentUnreadThickThreadIDs;
        }
        return getNotifsUnreadThickThreadIDs();
      })();

      [queriedUnreadCounts, unreadThickThreadIDs] = await Promise.all([
        queryNotifsUnreadCountStorage(unreadCountQueries),
        handleUnreadThickThreadIDsInNotifsStoragePromise,
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

      totalUnreadCount += unreadThickThreadIDs.length;
      document.title = getTitle(totalUnreadCount);
      electron?.setBadge(totalUnreadCount === 0 ? null : totalUnreadCount);
    })();
  }, [
    tunnelbrokerSocketState,
    currentUnreadThickThreadIDs,
    unreadCount,
    connection,
  ]);
}

function BadgeHandler(): React.Node {
  useBadgeHandler();
  return null;
}

export default BadgeHandler;
